<?php

namespace App\Services\Concerns;

use App\Models\Archive;
use Illuminate\Support\Facades\DB;

trait DeletesArchives
{
    public function delete(string $archiveId): void
    {
        Archive::findOrFail($archiveId);

        DB::transaction(function () use ($archiveId): void {
            $studentIds = DB::table('students')->where('archive_id', $archiveId)->pluck('id')->values();

            foreach ([
                'course_submission_answers',
                'course_submissions',
                'course_attendance',
                'course_questions',
                'satisfaction_responses',
                'satisfaction_questions',
                'final_exam_submission_answers',
                'final_exam_submissions',
                'final_exam_questions',
                'courses',
                'notifications',
                'reciters',
            ] as $table) {
                DB::table($table)->where('archive_id', $archiveId)->delete();
            }

            if ($studentIds->isNotEmpty()) {
                DB::table('reciter_students')->whereIn('student_id', $studentIds)->delete();
                DB::table('student_parts')->whereIn('student_id', $studentIds)->delete();
            }

            DB::table('students')->where('archive_id', $archiveId)->delete();
            DB::table('archives')->where('id', $archiveId)->delete();
            $this->clearDashboardCache();
        });
    }
}
