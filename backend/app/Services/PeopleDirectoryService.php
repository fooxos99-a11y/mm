<?php

namespace App\Services;

use App\Models\Reciter;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class PeopleDirectoryService
{
    public function __construct(private readonly PeopleDirectoryPresenter $presenter) {}

    public function paginate(User $user, array $filters): array
    {
        $branch = $filters['branchCode'] ?? match ($user->role) {
            'female_manager' => 'female', default => 'male',
        };
        $managedBranch = match ($user->role) {
            'male_manager' => 'male', 'female_manager' => 'female', 'admin' => null,
            default => abort(403),
        };
        abort_if($managedBranch !== null && $branch !== $managedBranch, 403);
        $perPage = (int) ($filters['perPage'] ?? 20);
        $search = trim($filters['search'] ?? '');
        if (($filters['type'] ?? 'student') === 'reciter') {
            $query = Reciter::query()->whereNull('archive_id')
                ->whereHas('branch', fn ($query) => $query->where('code', $branch))
                ->with(['user', 'branch', 'students' => fn ($query) => $query->whereNull('students.archive_id')]);
            if ($search !== '') {
                $query->where(fn ($query) => $query->where('full_name', 'like', '%'.$search.'%')
                    ->orWhereHas('user', fn ($user) => $user->where('login_code', 'like', '%'.$search.'%')));
            }
            $page = $query->orderBy('full_name')->orderBy('id')->paginate($perPage);
            $page->setCollection($page->getCollection()->map(fn ($reciter) => $this->presenter->reciter($reciter)));

            return $page->toArray();
        }

        $courseCount = DB::table('courses')->whereNull('archive_id')->where('entity_type', '!=', 'task')->count();
        $taskCount = DB::table('courses')->whereNull('archive_id')->where('entity_type', 'task')->count();
        $query = DB::table('students')->select('students.id', 'students.full_name')
            ->whereNull('students.archive_id')->join('branches', 'branches.id', '=', 'students.branch_id')
            ->where('branches.code', $branch);
        if ($search !== '') {
            $query->where(fn ($query) => $query->where('students.full_name', 'like', '%'.$search.'%')
                ->orWhere('students.login_code', 'like', '%'.$search.'%'));
        }
        $query->selectSub(DB::table('student_parts')->selectRaw('COUNT(*)')
            ->whereColumn('student_id', 'students.id'), 'parts_count');
        $query->selectSub(DB::table('course_attendance')->selectRaw('COUNT(*)')
            ->whereNull('archive_id')->whereColumn('login_code', 'students.login_code'), 'attendance_count');
        foreach (['pre', 'post', 'tasks'] as $type) {
            $counts = DB::table('course_submissions')->selectRaw('COUNT(DISTINCT course_id)')
                ->whereNull('archive_id')
                ->whereColumn('login_code', 'students.login_code')
                ->where('assessment_type', $type);
            if ($type === 'tasks') {
                $counts->where('task_review_status', 'approved');
            }
            $query->selectSub($counts, $type.'_count');
        }
        $totals = [
            'parts' => $branch === 'female' ? 10 : 30,
            'attendance' => max(1, $courseCount),
            'pre' => max(1, $courseCount),
            'post' => max(1, $courseCount),
            'tasks' => max(1, $taskCount),
        ];
        $percentages = [];
        foreach ($totals as $key => $total) {
            $percentages[] = "CASE WHEN {$key}_count >= {$total} THEN 100 "
                ."ELSE ROUND(100.0 * {$key}_count / {$total}) END";
        }
        // Counts cover the whole active dataset before sorting and pagination.
        $ranked = DB::query()->fromSub($query, 'directory')->select('directory.*')
            ->selectRaw('ROUND(('.implode(' + ', $percentages).') / 5.0) AS overall_progress');
        $sort = $filters['sort'] ?? 'all';
        if ($sort !== 'all') {
            $ranked->orderBy('overall_progress', $sort === 'highest-progress' ? 'desc' : 'asc');
        }
        $page = $ranked->orderBy('full_name')->orderBy('id')->paginate($perPage);
        $students = Student::query()->whereIn('id', $page->getCollection()->pluck('id'))
            ->with(
                ['branch', 'parts', 'registrationRequest', 'reciters' => fn ($query) => $query->whereNull('archive_id')]
            )
            ->get()->keyBy('id');
        $page->setCollection(
            $page->getCollection()->map(fn ($row) => $this->presenter->student($students[$row->id], $row, $totals))
        );

        return $page->toArray();
    }
}
