<?php

namespace App\Services;

use App\Models\Archive;
use App\Models\RegistrationRequest;
use App\Models\Student;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class ArchivedStudentDetailService
{
    public function get(string $archiveId, string $studentId): array
    {
        Archive::findOrFail($archiveId);

        $student = Student::query()
            ->where('archive_id', $archiveId)
            ->with(['branch', 'parts', 'registrationRequest'])
            ->whereKey($studentId)
            ->firstOrFail();

        $loginCodes = collect([$student->login_code, $student->archived_login_code])
            ->map(fn ($value): string => trim((string) $value))
            ->filter()
            ->unique()
            ->values();
        $courses = collect(DB::table('courses')
            ->where('archive_id', $archiveId)
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get());
        $records = $this->courseRecords($archiveId, $courses, $loginCodes);
        $finalExam = $this->finalExam($archiveId, $loginCodes);

        return [
            'archive' => [
                'id' => $archiveId,
                'name' => Archive::query()->whereKey($archiveId)->value('name'),
            ],
            'student' => [
                'id' => $student->id,
                'name' => $student->full_name,
                'note' => $student->note,
                'createdAt' => optional($student->created_at)?->toISOString(),
                'registrationProfile' => $this->registrationProfile($student->registrationRequest),
                'completionResult' => $this->completionResult($student->id),
            ],
            'summary' => [
                'preTests' => $records['submissions']->where('assessment_type', 'pre')->count(),
                'postTests' => $records['submissions']->where('assessment_type', 'post')->count(),
                'tasks' => $records['submissions']->where('assessment_type', 'tasks')->count(),
                'attendance' => $records['attendanceCount'],
            ],
            'courses' => $this->courseDetails($courses, $student->branch?->code ?? 'male', $records),
            'finalExam' => $finalExam,
        ];
    }

    private function courseRecords(string $archiveId, Collection $courses, Collection $loginCodes): array
    {
        $courseIds = $courses->pluck('id')->filter()->values();
        if ($courseIds->isEmpty()) {
            return [
                'submissions' => collect(),
                'submissionAnswers' => collect(),
                'attendance' => collect(),
                'attendanceCount' => 0,
                'satisfactionResponses' => collect(),
                'satisfactionQuestions' => collect(),
            ];
        }

        $submissions = collect(DB::table('course_submissions')
            ->where('archive_id', $archiveId)
            ->whereIn('login_code', $loginCodes)
            ->whereIn('course_id', $courseIds)
            ->orderByDesc('submitted_at')
            ->get());
        $attendanceRecords = collect(DB::table('course_attendance')
            ->where('archive_id', $archiveId)
            ->whereIn('login_code', $loginCodes)
            ->whereIn('course_id', $courseIds)
            ->orderByDesc('created_at')
            ->get());
        $satisfactionResponses = collect(DB::table('satisfaction_responses')
            ->where('archive_id', $archiveId)
            ->whereIn('login_code', $loginCodes)
            ->whereIn('course_id', $courseIds)
            ->orderByDesc('submitted_at')
            ->get());

        return [
            'submissions' => $submissions,
            'submissionAnswers' => collect(DB::table('course_submission_answers')
                ->where('archive_id', $archiveId)
                ->whereIn('submission_id', $submissions->pluck('id')->filter()->values())
                ->get())->groupBy('submission_id'),
            'attendance' => $attendanceRecords->keyBy('course_id'),
            'attendanceCount' => $attendanceRecords->count(),
            'satisfactionResponses' => $satisfactionResponses,
            'satisfactionQuestions' => collect(DB::table('satisfaction_questions')
                ->where('archive_id', $archiveId)
                ->whereIn('id', $satisfactionResponses->pluck('question_id')->filter()->values())
                ->get())->keyBy('id'),
        ];
    }

    private function courseDetails(Collection $courses, string $branchCode, array $records): array
    {
        $submissionsByCourse = $records['submissions']->groupBy('course_id');
        $satisfactionByCourse = $records['satisfactionResponses']->groupBy('course_id');

        return $courses->map(function ($course) use ($branchCode, $records, $submissionsByCourse, $satisfactionByCourse): array {
            $submissions = collect($submissionsByCourse->get($course->id, []));
            $attendance = $records['attendance']->get($course->id);

            return [
                'id' => $course->id,
                'title' => $course->title,
                'entityType' => $course->entity_type === 'task' ? 'task' : 'course',
                'branchAvailability' => [
                    'pre' => $branchCode === 'female' ? (bool) $course->female_pre_enabled : (bool) $course->male_pre_enabled,
                    'post' => $branchCode === 'female' ? (bool) $course->female_post_enabled : (bool) $course->male_post_enabled,
                    'tasks' => $branchCode === 'female' ? (bool) $course->female_tasks_enabled : (bool) $course->male_tasks_enabled,
                ],
                'attendance' => [
                    'isPresent' => (bool) $attendance,
                    'source' => $attendance?->source,
                    'createdAt' => $attendance ? (string) $attendance->created_at : null,
                ],
                'pre' => $this->submission($submissions->firstWhere('assessment_type', 'pre'), $records['submissionAnswers']),
                'post' => $this->submission($submissions->firstWhere('assessment_type', 'post'), $records['submissionAnswers']),
                'tasks' => $this->submission($submissions->firstWhere('assessment_type', 'tasks'), $records['submissionAnswers']),
                'satisfactionResponses' => collect($satisfactionByCourse->get($course->id, []))
                    ->map(function ($response) use ($records): array {
                        $question = $records['satisfactionQuestions']->get($response->question_id);

                        return [
                            'id' => $response->id,
                            'prompt' => $question->prompt ?? '',
                            'type' => $question->type ?? 'rating',
                            'ratingValue' => $response->rating_value !== null ? (int) $response->rating_value : null,
                            'textValue' => $response->text_value ?? '',
                            'submittedAt' => (string) $response->submitted_at,
                        ];
                    })->values()->all(),
            ];
        })->values()->all();
    }

    private function submission($submission, Collection $answers): ?array
    {
        if (! $submission) {
            return null;
        }

        return [
            'id' => $submission->id,
            'manualScore' => $submission->manual_score !== null ? (float) $submission->manual_score : null,
            'taskReviewStatus' => $submission->assessment_type === 'tasks' ? ($submission->task_review_status ?: 'pending') : null,
            'submittedAt' => (string) $submission->submitted_at,
            'answers' => collect($answers->get($submission->id, []))->map(fn ($answer): array => [
                'questionId' => $answer->question_id,
                'value' => $answer->answer_text ?? '',
                'fileName' => $answer->file_name,
                'fileType' => $answer->file_type,
            ])->values()->all(),
        ];
    }

    private function finalExam(string $archiveId, Collection $loginCodes): ?array
    {
        $submission = DB::table('final_exam_submissions')
            ->where('archive_id', $archiveId)
            ->whereIn('login_code', $loginCodes)
            ->first();
        if (! $submission) {
            return null;
        }

        return [
            'branchCode' => $submission->branch_code,
            'manualScore' => $submission->manual_score !== null ? (float) $submission->manual_score : null,
            'submittedAt' => (string) $submission->submitted_at,
            'answers' => DB::table('final_exam_submission_answers')
                ->where('archive_id', $archiveId)
                ->where('submission_id', $submission->id)
                ->get()
                ->map(fn ($answer): array => [
                    'questionId' => $answer->question_id,
                    'value' => $answer->answer_text ?? '',
                    'fileName' => $answer->file_name,
                    'fileType' => $answer->file_type,
                ])->values()->all(),
        ];
    }

    private function registrationProfile(?RegistrationRequest $request): ?array
    {
        return $request ? [
            'loginCode' => $request->login_code,
            'phone' => $request->phone,
            'gender' => $request->gender,
            'answers' => is_array($request->answers) ? array_values($request->answers) : [],
        ] : null;
    }

    private function completionResult(string $studentId): ?array
    {
        $result = DB::table('student_completion_results')->where('student_id', $studentId)->first();

        return $result ? [
            'status' => $result->status,
            'requirements' => json_decode((string) $result->requirements_snapshot, true) ?: [],
            'details' => json_decode((string) $result->details, true) ?: [],
            'finalizedAt' => (string) $result->finalized_at,
        ] : null;
    }
}
