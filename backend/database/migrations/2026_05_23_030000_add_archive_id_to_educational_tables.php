<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach ($this->tables() as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->foreignUuid('archive_id')->nullable()->constrained('archives')->nullOnDelete();
            });
        }

        $this->backfillCourseArchiveIds();
        $this->backfillSubmissionArchiveIds();
        $this->backfillFinalExamArchiveIds();
    }

    public function down(): void
    {
        foreach (array_reverse($this->tables()) as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropForeign(['archive_id']);
                $blueprint->dropColumn('archive_id');
            });
        }
    }

    private function tables(): array
    {
        return [
            'course_questions',
            'course_submissions',
            'course_submission_answers',
            'course_attendance',
            'satisfaction_questions',
            'satisfaction_responses',
            'final_exam_questions',
            'final_exam_submissions',
            'final_exam_submission_answers',
        ];
    }

    private function backfillCourseArchiveIds(): void
    {
        $courseArchiveIds = DB::table('courses')
            ->whereNotNull('archive_id')
            ->pluck('archive_id', 'id');

        foreach ($courseArchiveIds as $courseId => $archiveId) {
            DB::table('course_questions')
                ->where('course_id', $courseId)
                ->whereNull('archive_id')
                ->update(['archive_id' => $archiveId]);
            DB::table('course_submissions')
                ->where('course_id', $courseId)
                ->whereNull('archive_id')
                ->update(['archive_id' => $archiveId]);
            DB::table('course_attendance')
                ->where('course_id', $courseId)
                ->whereNull('archive_id')
                ->update(['archive_id' => $archiveId]);
            DB::table('satisfaction_questions')
                ->where('course_id', $courseId)
                ->whereNull('archive_id')
                ->update(['archive_id' => $archiveId]);
            DB::table('satisfaction_responses')
                ->where('course_id', $courseId)
                ->whereNull('archive_id')
                ->update(['archive_id' => $archiveId]);
        }
    }

    private function backfillSubmissionArchiveIds(): void
    {
        $submissionArchiveIds = DB::table('course_submissions')
            ->whereNotNull('archive_id')
            ->pluck('archive_id', 'id');

        foreach ($submissionArchiveIds as $submissionId => $archiveId) {
            DB::table('course_submission_answers')
                ->where('submission_id', $submissionId)
                ->whereNull('archive_id')
                ->update(['archive_id' => $archiveId]);
        }
    }

    private function backfillFinalExamArchiveIds(): void
    {
        $studentArchiveIds = DB::table('students')
            ->whereNotNull('archive_id')
            ->pluck('archive_id', 'login_code');

        foreach ($studentArchiveIds as $loginCode => $archiveId) {
            DB::table('final_exam_submissions')
                ->where('login_code', $loginCode)
                ->whereNull('archive_id')
                ->update(['archive_id' => $archiveId]);
        }

        $finalSubmissionArchiveIds = DB::table('final_exam_submissions')
            ->whereNotNull('archive_id')
            ->pluck('archive_id', 'id');

        foreach ($finalSubmissionArchiveIds as $submissionId => $archiveId) {
            DB::table('final_exam_submission_answers')
                ->where('submission_id', $submissionId)
                ->whereNull('archive_id')
                ->update(['archive_id' => $archiveId]);
        }
    }
};
