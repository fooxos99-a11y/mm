<?php

namespace App\Services;

use App\Models\Department;
use App\Support\DepartmentContext;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/** Central directory reads are only exposed by the general-manager route group. */
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
            ->orderByDesc('archives.created_at')->get(['archives.*', 'departments.name as departmentName']);
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
        return DepartmentContext::run($this->archiveDepartment($archiveId), fn () => $this->archives->show($archiveId));
    }

    public function searchStudents(string $name, ?string $departmentId = null): Collection
    {
        return $this->archivedStudents($departmentId)
            ->where('students.full_name', 'like', '%'.$name.'%')->orderBy('students.full_name')->limit(100)
            ->get(['students.id', 'students.full_name', 'students.archive_id', 'students.created_at',
                'students.archived_login_code as login_code', 'students.department_id as departmentId',
                'archives.name as archive_name', 'departments.name as departmentName']);
    }

    public function student(string $archiveId, string $studentId): array
    {
        return DepartmentContext::run($this->archiveDepartment($archiveId),
            fn () => $this->studentDetails->get($archiveId, $studentId));
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
