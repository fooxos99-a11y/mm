<?php

namespace App\Services;

use App\Models\Archive;
use App\Models\Department;
use App\Support\DepartmentContext;
use Closure;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/** Central live records are for the general manager; archive reads are also shared by department admins. */
final class DepartmentDirectoryService
{
    public function __construct(
        private readonly ArchiveQueryService $archives,
        private readonly ArchivedStudentDetailService $studentDetails,
    ) {
    }

    public function assertActive(?string $departmentId): void
    {
        if ($departmentId !== null) {
            abort_unless(Department::query()->whereKey($departmentId)->where('is_active', true)->exists(), 404);
        }
    }

    public function publicDepartments(): Collection
    {
        return Department::query()->where('is_active', true)->orderBy('name')
            ->get(['id', 'name'])->map(fn (Department $department): array => [
                'id' => $department->id, 'name' => $department->name, 'label' => $department->name,
            ]);
    }

    public function archives(?string $departmentId = null, ?string $search = null): array
    {
        $archives = DB::table('archives')->join('departments', 'departments.id', '=', 'archives.department_id')
            ->when($departmentId, fn ($query, $id) => $query->where('departments.id', $id))
            ->orderByDesc('archives.created_at')->get(['archives.*', 'departments.name as departmentName'])
            ->map(function ($archive) {
                $archive->department_name = $archive->departmentName;
                $archive->can_manage = $this->canManageArchive($archive->department_id);

                return $archive;
            });
        $students = [];
        if (filled($search)) {
            $students = $this->archivedStudents($departmentId)
                ->where('students.full_name', 'like', '%'.$search.'%')->limit(100)
                ->get(['students.id', 'students.full_name', 'students.archive_id', 'students.department_id as departmentId',
                    'archives.name as archive_name', 'departments.name as departmentName'])->all();
        }

        return ['archives' => $archives, 'students' => $students];
    }

    public function archive(string $archiveId): array
    {
        $result = $this->inArchiveDepartment($archiveId, fn () => $this->archives->show($archiveId));
        $result['archive'] = $this->archiveForResponse($result['archive']);

        return $result;
    }

    public function records(array $filters): array
    {
        $batch = $filters['batch'] ?? 'current';
        $search = trim((string) ($filters['search'] ?? ''));
        $query = DB::table('students')->join('departments', 'departments.id', '=', 'students.department_id')
            ->leftJoin('branches', 'branches.id', '=', 'students.branch_id')
            ->leftJoin('archives', function ($join): void {
                $join->on('archives.id', '=', 'students.archive_id')->on('archives.department_id', '=', 'students.department_id');
            })
            ->where(fn ($q) => $q->whereNull('students.archive_id')->orWhereNotNull('archives.id'))
            ->when($filters['departmentId'] ?? null, fn ($q, $id) => $q->where('students.department_id', $id))
            ->when($batch === 'current', fn ($q) => $q->whereNull('students.archive_id'))
            ->when($batch === 'archived', fn ($q) => $q->whereNotNull('students.archive_id'))
            ->when($filters['archiveId'] ?? null, fn ($q, $id) => $q->where('students.archive_id', $id))
            ->when($search !== '', fn ($q) => $q->where(fn ($q) => $q
                ->where('students.full_name', 'like', '%'.$search.'%')
                ->orWhere('students.login_code', 'like', '%'.$search.'%')
                ->orWhere('students.archived_login_code', 'like', '%'.$search.'%')));
        $total = (clone $query)->count();
        $perPage = 25;
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = min((int) ($filters['page'] ?? 1), $lastPage);
        $students = $query->orderBy('students.full_name')->orderBy('students.id')->forPage($page, $perPage)
            ->get(['students.id', 'students.full_name', 'students.archive_id', 'students.department_id as departmentId',
                'students.login_code', 'students.archived_login_code', 'archives.name as archive_name',
                'branches.name as branchName', 'departments.name as departmentName'])
            ->map(function ($student) {
                $student->login_code = $student->archived_login_code ?: $student->login_code;
                unset($student->archived_login_code);

                return $student;
            });

        return ['students' => $students, 'pagination' => [
            'total' => $total, 'page' => $page, 'perPage' => $perPage, 'lastPage' => $lastPage,
        ]];
    }

    public function currentStudent(string $studentId): array
    {
        $id = DB::table('students')->where('id', $studentId)->whereNull('archive_id')->value('department_id');
        abort_unless($id, 404);

        return DepartmentContext::run($id, fn () => $this->studentDetails->get(null, $studentId));
    }

    public function searchStudents(string $name, ?string $departmentId = null): Collection
    {
        return $this->archivedStudents($departmentId)
            ->leftJoin('branches', 'branches.id', '=', 'students.branch_id')
            ->leftJoin('student_completion_results', function ($join): void {
                $join->on('student_completion_results.student_id', '=', 'students.id')
                    ->on('student_completion_results.department_id', '=', 'students.department_id');
            })
            ->where('students.full_name', 'like', '%'.$name.'%')->orderBy('students.full_name')->limit(100)
            ->get(['students.id', 'students.full_name', 'students.archive_id', 'students.created_at',
                'students.login_code', 'students.archived_login_code', 'students.department_id as departmentId',
                'archives.name as archive_name', 'departments.name as departmentName',
                'branches.code as branch_code', 'branches.name as branch_name',
                'student_completion_results.status as completionStatus'])
            ->map(function ($student) {
                $student->login_code = $student->archived_login_code ?: $student->login_code;
                $student->department_name = $student->departmentName;
                $student->branch = $student->branch_code ? ['id' => $student->branch_code, 'name' => $student->branch_name] : null;
                unset($student->archived_login_code, $student->branch_code, $student->branch_name);

                return $student;
            });
    }

    public function student(string $archiveId, string $studentId): array
    {
        return $this->inArchiveDepartment($archiveId,
            fn () => $this->studentDetails->get($archiveId, $studentId));
    }

    public function archiveForResponse(Archive $archive): Archive
    {
        $archive->setAttribute('department_name', DB::table('departments')->where('id', $archive->department_id)->value('name'));
        $archive->setAttribute('can_manage', $this->canManageArchive($archive->department_id));

        return $archive;
    }

    public function inArchiveDepartment(string $archiveId, Closure $callback, bool $manage = false): mixed
    {
        $departmentId = $this->archiveDepartment($archiveId);
        abort_if($manage && ! $this->canManageArchive($departmentId), 404);

        return DepartmentContext::run($departmentId, $callback);
    }

    private function canManageArchive(string $departmentId): bool
    {
        $user = request()->user();

        return $user?->role === 'super_admin'
            || ($user?->role === 'admin' && $user->department_id === $departmentId);
    }

    private function archiveDepartment(string $archiveId): string
    {
        $id = DB::table('archives')->where('id', $archiveId)->value('department_id');
        abort_unless($id, 404);

        return $id;
    }

    private function archivedStudents(?string $departmentId): Builder
    {
        return DB::table('students')->join('archives', function ($join): void {
            $join->on('archives.id', '=', 'students.archive_id')
                ->on('archives.department_id', '=', 'students.department_id');
        })->join('departments', 'departments.id', '=', 'students.department_id')
            ->when($departmentId, fn ($query, $id) => $query->where('departments.id', $id));
    }
}
