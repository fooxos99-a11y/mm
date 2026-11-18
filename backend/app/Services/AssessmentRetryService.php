<?php

namespace App\Services;

use App\Models\Student;
use App\Support\DepartmentData as DB;
use Illuminate\Validation\ValidationException;

class AssessmentRetryService
{
    public function __construct(
        private readonly AssessmentAttachmentService $attachments,
        private readonly DashboardCommunicationService $communication,
    ) {
    }

    public function reset(string $submissionId): void
    {
        $paths = DB::transaction(function () use ($submissionId): array {
            $submission = DB::table('course_submissions')->where('id', $submissionId)->whereNull('archive_id')->first();
            abort_unless($submission, 404);
            $student = Student::query()->with('branch')->whereNull('archive_id')
                ->where('login_code', $submission->login_code)->lockForUpdate()->first();
            abort_unless($student, 404);
            $submission = DB::table('course_submissions')->where('id', $submissionId)
                ->whereNull('archive_id')->lockForUpdate()->first();
            abort_unless($submission, 404);
            abort_unless(DB::table('courses')->where('id', $submission->course_id)->whereNull('archive_id')->exists(), 404);
            if (DB::table('completion_requirement_settings')->where('branch_code', $student->branch?->code)
                ->where('is_closed', true)->exists()) {
                throw ValidationException::withMessages(['submissionId' => 'أعد فتح اعتماد النتائج قبل إعادة المحاولة.']);
            }

            $scope = ['course_id' => $submission->course_id, 'student_id' => $student->id,
                'assessment_type' => $submission->assessment_type];
            DB::table('assessment_retries')->updateOrInsert($scope, ['id' => (string) str()->uuid()]);
            $paths = DB::table('course_submission_answers')->where('submission_id', $submissionId)
                ->pluck('file_path')->filter()->unique()->all();
            DB::table('course_submission_answers')->where('submission_id', $submissionId)->delete();
            DB::table('course_submissions')->where('id', $submissionId)->delete();
            $settings = DB::table('course_score_settings')->where('course_id', $submission->course_id)
                ->where('assessment_type', $submission->assessment_type)->pluck('id');
            DB::table('course_manual_scores')->where('student_id', $student->id)->whereIn('setting_id', $settings)->delete();

            return $paths;
        });
        foreach ($paths as $path) {
            $this->attachments->deleteIfUnreferenced($path);
        }
        $this->communication->clearCaches();
    }
}
