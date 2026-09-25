<?php

namespace App\Services\Concerns;

use App\Models\Student;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

trait ImportsCourseAssessments
{
    public function bulkImportAssessments(string $courseId, string $assessmentType, array $submissions): array
    {
        if (! in_array($assessmentType, ['pre', 'post', 'tasks'], true)) {
            throw ValidationException::withMessages(['assessmentType' => 'نوع التقييم غير صالح.']);
        }
        if (! DB::table('courses')->where('id', $courseId)->whereNull('archive_id')->exists()) {
            throw ValidationException::withMessages(['courseId' => 'الدورة المحددة غير موجودة.']);
        }
        if ($submissions === []) {
            return [];
        }

        $dedupedByLogin = [];
        foreach ($submissions as $submission) {
            $dedupedByLogin[$submission['loginId']] = $submission;
        }
        $normalizedSubmissions = array_values($dedupedByLogin);
        $loginIds = array_values(array_map(fn (array $submission) => $submission['loginId'], $normalizedSubmissions));
        $actionableSubmissions = array_values(array_filter($normalizedSubmissions, function (array $submission): bool {
            $hasManualScore = isset($submission['manualScore']) && is_numeric($submission['manualScore']) && (float) $submission['manualScore'] >= 0;
            $hasAnswers = collect($submission['answers'] ?? [])->contains(function (array $answer): bool {
                return ($answer['questionId'] ?? '') !== '__score_override__'
                    && (trim((string) ($answer['value'] ?? '')) !== '' || ! empty($answer['file']) || ! empty($answer['fileDataUrl']));
            });

            return $hasManualScore || $hasAnswers;
        }));
        $questionSnapshots = $this->questionService->snapshots($courseId, $assessmentType, $actionableSubmissions);

        return DB::transaction(function () use ($courseId, $assessmentType, $loginIds, $actionableSubmissions, $normalizedSubmissions, $questionSnapshots): array {
            $existingIds = DB::table('course_submissions')
                ->where('course_id', $courseId)->where('assessment_type', $assessmentType)
                ->whereNull('archive_id')->whereIn('login_code', $loginIds)->pluck('id')->all();

            if ($existingIds !== []) {
                DB::table('course_submission_answers')->whereIn('submission_id', $existingIds)->delete();
                DB::table('course_submissions')->where('course_id', $courseId)
                    ->where('assessment_type', $assessmentType)->whereNull('archive_id')
                    ->whereIn('login_code', $loginIds)->delete();
            }
            if ($actionableSubmissions === []) {
                return [];
            }

            $studentIdByLogin = Student::query()
                ->whereIn('login_code', array_map(fn (array $submission) => $submission['loginId'], $actionableSubmissions))
                ->pluck('id', 'login_code')->all();
            $inserted = [];
            $answersToInsert = [];

            foreach ($actionableSubmissions as $submission) {
                $submissionId = (string) str()->uuid();
                $submittedAt = now();
                DB::table('course_submissions')->insert([
                    'id' => $submissionId,
                    'course_id' => $courseId,
                    'assessment_type' => $assessmentType,
                    'student_id' => $studentIdByLogin[$submission['loginId']] ?? null,
                    'student_name' => $submission['studentName'],
                    'login_code' => $submission['loginId'],
                    'manual_score' => isset($submission['manualScore']) && is_numeric($submission['manualScore']) ? (float) $submission['manualScore'] : null,
                    'task_review_status' => $assessmentType === 'tasks' ? 'pending' : null,
                    'submitted_at' => $submittedAt,
                ]);

                foreach (($submission['answers'] ?? []) as $answer) {
                    if (($answer['questionId'] ?? '') === '__score_override__') {
                        continue;
                    }
                    $question = $questionSnapshots->get(trim((string) $answer['questionId']));
                    $answersToInsert[] = [
                        'id' => (string) str()->uuid(),
                        'submission_id' => $submissionId,
                        'question_id' => $answer['questionId'],
                        'answer_text' => $answer['value'] ?? null,
                        ...$this->assessmentAttachmentService->storeAnswer($answer),
                        'created_at' => now(),
                        ...$this->questionService->snapshotColumns($question),
                    ];
                }
                $inserted[] = ['id' => $submissionId, 'submittedAt' => $submittedAt->toISOString(), 'loginId' => $submission['loginId']];
            }

            if ($answersToInsert !== []) {
                DB::table('course_submission_answers')->insert($answersToInsert);
            }

            return array_values(array_filter($inserted, function (array $row) use ($normalizedSubmissions): bool {
                return collect($normalizedSubmissions)->contains(fn (array $submission) => $submission['loginId'] === $row['loginId']);
            }));
        });
    }
}
