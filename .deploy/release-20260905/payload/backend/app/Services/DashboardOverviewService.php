<?php

namespace App\Services;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class DashboardOverviewService
{
    public function totals(string $branch): array
    {
        $students = DB::table('students')->join('branches', 'branches.id', '=', 'students.branch_id')
            ->whereNull('students.archive_id')->where('branches.code', $branch);
        $parts = DB::table('student_parts')->selectRaw('COUNT(DISTINCT part_number)')->whereColumn('student_id', 'students.id');
        $counted = (clone $students)->select('students.is_certified')->selectSub($parts, 'parts_count');
        $limit = $branch === 'female' ? 10 : 30;
        $summary = DB::query()->fromSub($counted, 'counted')->selectRaw(
            'COUNT(*) AS students, COALESCE(SUM(parts_count), 0) AS parts, COALESCE(SUM(CASE WHEN is_certified = 1 OR parts_count >= ? THEN 1 ELSE 0 END), 0) AS completed', [$limit],
        )->first();
        $total = (int) $summary->students;
        $courses = DB::table('courses')->whereNull('archive_id');
        $nonTasks = (clone $courses)->where('entity_type', '!=', 'task');
        $logins = (clone $students)->select('students.login_code');
        $totals = [
            'memorization' => [(int) $summary->parts, $total * $limit],
            'attendance' => [$this->completed('course_attendance', $logins, $nonTasks), $total * $nonTasks->count()],
        ];
        foreach (['pre', 'post', 'tasks'] as $type) {
            $eligible = (clone $courses)->where('entity_type', $type === 'tasks' ? '=' : '!=', 'task')
                ->where('is_'.$type.'_enabled', true)->where($branch.'_'.$type.'_enabled', true);
            $totals[$type] = [$this->completed('course_submissions', $logins, $eligible, $type), $total * $eligible->count()];
        }
        $totals['completed30'] = [(int) $summary->completed, $total];

        return $totals;
    }

    public function indicators(array $totals): array
    {
        $labels = ['memorization' => 'مجموع الأجزاء المقروءة', 'attendance' => 'الحضور',
            'pre' => 'الاختبار القبلي', 'post' => 'الاختبار البعدي', 'tasks' => 'المهام الأدائية',
            'completed30' => 'من أكملوا الأجزاء المطلوبة'];
        $result = [];
        foreach ($totals as $key => [$count, $total]) {
            $progress = $total ? $count / $total * 100 : 0;
            $result[] = ['key' => $key, 'label' => $labels[$key],
                'display' => in_array($key, ['memorization', 'completed30'], true) ? (string) $count : round($progress).'%',
                'meta' => $count.' من '.$total, 'progress' => $progress];
        }

        return $result;
    }

    private function completed(string $table, Builder $logins, Builder $courses, ?string $type = null): int
    {
        $slots = DB::table($table)->whereNull('archive_id')->whereIn('login_code', $logins)
            ->whereIn('course_id', (clone $courses)->select('id'))
            ->when($type, fn ($query) => $query->where('assessment_type', $type))
            ->select('course_id', 'login_code')->distinct();

        return DB::query()->fromSub($slots, 'slots')->count();
    }
}
