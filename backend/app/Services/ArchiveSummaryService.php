<?php

namespace App\Services;

use App\Support\DepartmentData as DB;

final class ArchiveSummaryService
{
    /** Counts actual records in the current department; parts are counted once per person and part. */
    public function counts(?string $archiveId, string $batchType = 'all'): array
    {
        $students = DB::table('students')->join('branches', 'branches.id', '=', 'students.branch_id')
            ->where('students.archive_id', $archiveId)
            ->when($batchType !== 'all', fn ($query) => $query->where('branches.code', $batchType));
        $courses = DB::table('courses')->where('archive_id', $archiveId);

        return [
            'courses_count' => (clone $courses)->where('entity_type', '!=', 'task')->count(),
            'tasks_count' => (clone $courses)->where('entity_type', 'task')->count(),
            'male_teachers_count' => (clone $students)->where('branches.code', 'male')->count(),
            'female_teachers_count' => (clone $students)->where('branches.code', 'female')->count(),
            'completed_parts_count' => DB::table('student_parts')
                ->whereIn('student_id', (clone $students)->select('students.id'))->count(),
        ];
    }
}
