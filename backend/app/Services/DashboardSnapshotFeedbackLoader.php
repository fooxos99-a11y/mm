<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DashboardSnapshotFeedbackLoader
{
    private const MAX_SNAPSHOT_RECORDS = 1000;

    public function load(
        bool $restrictStudentData,
        Collection $allowedStudentLogins,
        Collection $visibleBranchCodes,
        bool $includeAll = false,
        int $page = 1,
    ): array {
        $satisfactionResponsesQuery = DB::table('satisfaction_responses')
            ->whereNull('archive_id')
            ->orderByDesc('submitted_at')->orderByDesc('id');
        $finalExamQuestionsQuery = DB::table('final_exam_questions')
            ->whereNull('archive_id')
            ->orderBy('sort_order')->orderBy('id');
        $finalExamSubmissionsQuery = DB::table('final_exam_submissions')
            ->whereNull('archive_id')
            ->orderByDesc('submitted_at')->orderByDesc('id');

        if ($restrictStudentData) {
            $loginCodes = $allowedStudentLogins->all();
            $satisfactionResponsesQuery->whereIn('login_code', $loginCodes);
            $finalExamQuestionsQuery->whereIn('branch_code', $visibleBranchCodes->all());
            $finalExamSubmissionsQuery->whereIn('login_code', $loginCodes);
        }

        $satisfactionResponseCount = (clone $satisfactionResponsesQuery)->count();
        $finalExamSubmissionCount = (clone $finalExamSubmissionsQuery)->count();
        $finalExamSubmissions = $finalExamSubmissionsQuery
            ->when(! $includeAll, fn ($query) => $query->forPage($page, self::MAX_SNAPSHOT_RECORDS))
            ->get();
        $finalExamAnswersQuery = DB::table('final_exam_submission_answers')->whereNull('archive_id');

        $finalExamAnswersQuery->whereIn('submission_id', $finalExamSubmissions->pluck('id')->all());

        return [
            'satisfactionQuestions' => DB::table('satisfaction_questions')
                ->whereNull('archive_id')
                ->orderBy('sort_order')
                ->get(),
            'satisfactionResponses' => $satisfactionResponsesQuery->when(
                ! $includeAll,
                fn ($query) => $query->forPage($page, self::MAX_SNAPSHOT_RECORDS)
            )
                ->get(),
            'finalExamQuestions' => $finalExamQuestionsQuery->get(),
            'finalExamSubmissions' => $finalExamSubmissions,
            'finalExamAnswers' => $finalExamAnswersQuery->get()->groupBy('submission_id'),
            'finalExamSettings' => DB::table('final_exam_settings')->get()->keyBy('branch_code'),
            'meta' => [
                'satisfactionResponses' => $this->datasetMeta($satisfactionResponseCount, $includeAll, $page),
                'finalExamSubmissions' => $this->datasetMeta($finalExamSubmissionCount, $includeAll, $page),
            ],
        ];
    }

    /** @return array{total: int, returned: int, truncated: bool} */
    private function datasetMeta(int $total, bool $includeAll, int $page): array
    {
        return [
            'total' => $total,
            'returned' => $includeAll
                ? $total
                : min(max(0, $total - ($page - 1) * self::MAX_SNAPSHOT_RECORDS), self::MAX_SNAPSHOT_RECORDS),
            'truncated' => ! $includeAll && $total > $page * self::MAX_SNAPSHOT_RECORDS,
            'nextPage' => ! $includeAll && $total > $page * self::MAX_SNAPSHOT_RECORDS ? $page + 1 : null,
        ];
    }
}
