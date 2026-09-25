<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DashboardSnapshotCourseLoader
{
    private const MAX_SNAPSHOT_RECORDS = 1000;

    public function load(bool $restrictStudentData, Collection $allowedStudentLogins, bool $includeAll = false, int $page = 1): array
    {
        $submissionsQuery = DB::table('course_submissions')
            ->whereNull('archive_id')
            ->orderByDesc('submitted_at')->orderByDesc('id');
        $attendanceQuery = DB::table('course_attendance')
            ->whereNull('archive_id')
            ->orderByDesc('created_at')->orderByDesc('id');

        if ($restrictStudentData) {
            $loginCodes = $allowedStudentLogins->all();
            $submissionsQuery->whereIn('login_code', $loginCodes);
            $attendanceQuery->whereIn('login_code', $loginCodes);
        }

        $submissionCount = (clone $submissionsQuery)->count();
        $attendanceCount = (clone $attendanceQuery)->count();
        $submissions = $submissionsQuery
            ->when(! $includeAll, fn ($query) => $query->forPage($page, self::MAX_SNAPSHOT_RECORDS))
            ->get();
        $submissionAnswersQuery = DB::table('course_submission_answers')->whereNull('archive_id');

        $submissionAnswersQuery->whereIn('submission_id', $submissions->pluck('id')->all());

        return [
            'courses' => DB::table('courses')->whereNull('archive_id')->orderBy('sort_order')->orderBy('created_at')->get(),
            'questions' => DB::table('course_questions')->whereNull('archive_id')->orderBy('sort_order')->get()->groupBy('course_id'),
            'submissions' => $submissions,
            'submissionAnswers' => $submissionAnswersQuery->get()->groupBy('submission_id'),
            'attendance' => $attendanceQuery->when(! $includeAll, fn ($query) => $query->forPage($page, self::MAX_SNAPSHOT_RECORDS))->get(),
            'taskTemplates' => DB::table('task_templates')->orderByDesc('created_at')->orderByDesc('id')->get(),
            'meta' => [
                'submissions' => $this->datasetMeta($submissionCount, $includeAll, $page),
                'attendance' => $this->datasetMeta($attendanceCount, $includeAll, $page),
            ],
        ];
    }

    /** @return array{total: int, returned: int, truncated: bool} */
    private function datasetMeta(int $total, bool $includeAll, int $page): array
    {
        return [
            'total' => $total,
            'returned' => $includeAll ? $total : min(max(0, $total - ($page - 1) * self::MAX_SNAPSHOT_RECORDS), self::MAX_SNAPSHOT_RECORDS),
            'truncated' => ! $includeAll && $total > $page * self::MAX_SNAPSHOT_RECORDS,
            'nextPage' => ! $includeAll && $total > $page * self::MAX_SNAPSHOT_RECORDS ? $page + 1 : null,
        ];
    }
}
