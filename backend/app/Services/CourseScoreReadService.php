<?php

namespace App\Services;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use App\Support\DepartmentData as DB;

class CourseScoreReadService
{
    public function query(): Builder
    {
        return DB::table('course_manual_scores as scores')
            ->join('course_score_settings as settings', 'settings.id', '=', 'scores.setting_id')
            ->join('students', 'students.id', '=', 'scores.student_id')
            ->join('branches', 'branches.id', '=', 'students.branch_id')
            ->join('courses', 'courses.id', '=', 'settings.course_id')
            ->leftJoin('course_submissions as actual', function ($join) {
                $join->on('actual.course_id', '=', 'settings.course_id')
                    ->on('actual.assessment_type', '=', 'settings.assessment_type')
                    ->on('actual.login_code', '=', 'students.login_code')->whereNull('actual.archive_id');
            })
            ->whereNull('students.archive_id')->whereNull('courses.archive_id')
            ->whereColumn('branches.code', 'settings.branch_code')
            ->select('scores.*', 'settings.course_id', 'settings.assessment_type', 'settings.total_points',
                'students.full_name as student_name', 'students.login_code', 'actual.id as actual_submission_id');
    }

    public function settings(string $courseId, string $type, string $branch): array
    {
        $total = (float) DB::table('course_questions')->where('course_id', $courseId)
            ->where('assessment_type', $type)->whereNull('archive_id')->whereNull('deleted_at')->sum('points');
        $setting = DB::table('course_score_settings')->where('course_id', $courseId)
            ->where('assessment_type', $type)->where('branch_code', $branch)->first();

        return ['totalPoints' => $setting ? (float) $setting->total_points : ($total > 0 ? $total : null),
            'totalLocked' => $total > 0 || $setting !== null];
    }

    public function merge(Collection $submissions, Collection $scores): Collection
    {
        $byScope = $scores->keyBy(fn ($score) => $this->key($score));
        $seen = [];
        $merged = $submissions->map(function ($submission) use ($byScope, &$seen) {
            $key = $this->key($submission);
            $seen[$key] = true;
            $score = $byScope->get($key);
            if (! $score) {
                return $submission;
            }
            $result = clone $submission;
            $result->manual_score = $score->score;
            $result->score_total = $score->score === null ? null : $score->total_points;
            $result->score_source = $score->score === null ? null : 'manual';
            $result->score_recorded_at = $score->updated_at;

            return $result;
        });
        foreach ($scores as $score) {
            if (isset($seen[$this->key($score)]) || $score->score === null || $score->actual_submission_id) {
                continue;
            }
            $merged->push((object) [
                'id' => $score->id, 'course_id' => $score->course_id, 'assessment_type' => $score->assessment_type,
                'student_name' => $score->student_name, 'login_code' => $score->login_code,
                'manual_score' => $score->score, 'score_total' => $score->total_points,
                'score_only' => true, 'score_source' => 'manual', 'score_recorded_at' => $score->updated_at,
                'task_review_status' => null, 'task_reviewed_at' => null, 'submitted_at' => null,
            ]);
        }

        return $merged;
    }

    private function key(object $record): string
    {
        return $record->course_id.'|'.$record->assessment_type.'|'.$record->login_code;
    }
}
