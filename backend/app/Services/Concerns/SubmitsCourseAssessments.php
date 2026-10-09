<?php

namespace App\Services\Concerns;

use App\Models\Student;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

trait SubmitsCourseAssessments
{
    public function submitAssessment(string $courseId, string $assessmentType, array $submission): array
    {
        if (! in_array($assessmentType, ['pre', 'post', 'tasks'], true)) {
            throw ValidationException::withMessages(['assessmentType' => 'نوع التقييم غير صالح.']);
        }

        $course = DB::table('courses')->where('id', $courseId)->whereNull('archive_id')->first();
        if (! $course) {
            throw ValidationException::withMessages(['courseId' => 'الدورة المحددة غير موجودة.']);
        }

        $loginId = trim($submission['loginId']);
        $studentName = trim($submission['studentName']);
        if ($loginId === '' || $studentName === '') {
            throw ValidationException::withMessages(['loginId' => 'بيانات المعلم/ة غير مكتملة.']);
        }

        $student = Student::query()->with('branch')->where('login_code', $loginId)->first();
        $this->availabilityService->assertOpen($course, $assessmentType, $student);
        $questionSnapshots = $this->questionService->snapshots($courseId, $assessmentType, [$submission]);

        if (DB::table('course_submissions')->where('course_id', $courseId)
            ->where('assessment_type', $assessmentType)->where('login_code', $loginId)->exists()) {
            throw ValidationException::withMessages(
                ['loginId' => 'تم إرسال هذا الاختبار مسبقًا، ولا يمكن إعادة الاختبار مرة أخرى.']
            );
        }

        $studentId = Student::query()->where('login_code', $loginId)->value('id');
        $submissionId = (string) str()->uuid();
        $submittedAt = now();

        try {
            DB::transaction(function () use (
                $submissionId,
                $submittedAt,
                $courseId,
                $assessmentType,
                $studentId,
                $studentName,
                $loginId,
                $submission,
                $questionSnapshots
            ) {
                // The unique scope rejects simultaneous retries without locking gaps for other students.
                DB::table('course_submissions')->insert([
                    'id' => $submissionId,
                    'course_id' => $courseId,
                    'assessment_type' => $assessmentType,
                    'student_id' => $studentId,
                    'student_name' => $studentName,
                    'login_code' => $loginId,
                    'manual_score' => null,
                    'task_review_status' => $assessmentType === 'tasks' ? 'pending' : null,
                    'task_reviewed_by' => null,
                    'task_reviewed_at' => null,
                    'submitted_at' => $submittedAt,
                ]);

                $answers = collect($submission['answers'] ?? [])
                    ->filter(fn (array $answer) => ($answer['questionId'] ?? '') !== '__score_override__')
                    ->map(function (array $answer) use ($submissionId, $questionSnapshots): array {
                        $question = $questionSnapshots->get(trim((string) $answer['questionId']));

                        return [
                            'id' => (string) str()->uuid(),
                            'submission_id' => $submissionId,
                            'question_id' => $answer['questionId'],
                            'answer_text' => $answer['value'] ?? null,
                            ...$this->assessmentAttachmentService->storeAnswer($answer),
                            'created_at' => now(),
                            ...$this->questionService->snapshotColumns($question),
                        ];
                    })->all();
                if ($answers !== []) {
                    DB::table('course_submission_answers')->insert($answers);
                }
            });
        } catch (UniqueConstraintViolationException $exception) {
            if (! DB::table('course_submissions')->where('course_id', $courseId)
                ->where('assessment_type', $assessmentType)->where('login_code', $loginId)->exists()) {
                throw $exception;
            }

            throw ValidationException::withMessages(
                ['loginId' => 'تم إرسال هذا الاختبار مسبقًا، ولا يمكن إعادة الاختبار مرة أخرى.']
            );
        }

        if ($assessmentType === 'tasks') {
            $this->dashboardCommunicationService->addNotification([
                'title' => 'مهمة تحتاج مراجعة',
                'message' => sprintf(
                    '%s انتهى من مهمة %s وتحتاج مراجعة للإتمام.',
                    $studentName,
                    $course->title ?? 'المهمة'
                ),
                'targetBranchId' => $student?->branch?->code,
                'targetLoginIds' => [],
                'createdByName' => 'النظام',
                'createdByRole' => 'system',
            ]);
        }

        return ['id' => $submissionId, 'submittedAt' => $submittedAt->toISOString()];
    }
}
