<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class QuestionDeletionService
{
    private const ANSWER_TABLES = [
        'course_questions' => 'course_submission_answers',
        'final_exam_questions' => 'final_exam_submission_answers',
        'satisfaction_questions' => 'satisfaction_responses',
    ];

    private const SUBMISSION_SCOPES = [
        'course_questions' => ['course_submissions', ['course_id', 'assessment_type']],
        'final_exam_questions' => ['final_exam_submissions', ['branch_code']],
    ];

    public function delete(string $table, array $ids): void
    {
        $answerTable = self::ANSWER_TABLES[$table];
        DB::transaction(function () use ($table, $answerTable, $ids): void {
            $activeIds = DB::table($table)->whereIn('id', $ids)->whereNull('archive_id')
                ->whereNull('deleted_at')->orderBy('id')->lockForUpdate()->pluck('id');
            $answeredIds = DB::table($answerTable)->whereIn('question_id', $activeIds)
                ->distinct()->pluck('question_id');
            if (isset(self::SUBMISSION_SCOPES[$table])) {
                [$submissions, $columns] = self::SUBMISSION_SCOPES[$table];
                $historicalIds = DB::table($table)->whereIn('id', $activeIds)->whereExists(
                    function ($query) use ($table, $submissions, $columns): void {
                        $query->selectRaw('1')->from($submissions)->whereNull($submissions.'.archive_id');
                        foreach ($columns as $column) {
                            $query->whereColumn($submissions.'.'.$column, $table.'.'.$column);
                        }
                    }
                )->pluck('id');
                $answeredIds = $answeredIds->merge($historicalIds)->unique();
            }

            // Keep the original question set, including unanswered questions, for historical scores.
            $updates = ['deleted_at' => now()];
            if ($table === 'satisfaction_questions') {
                $updates['global_template_id'] = null;
            }
            DB::table($table)->whereIn('id', $answeredIds)->update($updates);
            DB::table($table)->whereIn('id', $activeIds->diff($answeredIds))->delete();
        });
    }
}
