<?php

namespace App\Services;

use App\Models\Archive;
use App\Models\Student;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class ArchiveQueryService
{
    public function list(): EloquentCollection
    {
        return Archive::query()->orderByDesc('created_at')->get();
    }

    public function searchStudents(string $name): Collection
    {
        return Student::query()
            ->select([
                'students.id',
                'students.full_name',
                'students.login_code',
                'students.archived_login_code',
                'students.created_at',
                'students.archive_id',
                'archives.name as archive_name',
                'student_completion_results.status as completion_status',
            ])
            ->leftJoin('archives', 'archives.id', '=', 'students.archive_id')
            ->leftJoin('student_completion_results', 'student_completion_results.student_id', '=', 'students.id')
            ->with('branch')
            ->whereNotNull('students.archive_id')
            ->where('students.full_name', 'like', '%'.trim($name).'%')
            ->orderBy('students.full_name')
            ->orderByDesc('students.created_at')
            ->limit(100)
            ->get()
            ->map(fn (Student $student): array => $this->studentSummary($student, true))
            ->values();
    }

    public function show(string $archiveId): array
    {
        $archive = Archive::findOrFail($archiveId);
        $students = Student::query()
            ->where('archive_id', $archiveId)
            ->with('branch')
            ->orderBy('created_at')
            ->get()
            ->map(fn (Student $student): array => $this->studentSummary($student))
            ->values();

        return [
            'archive' => $archive,
            'students' => $students,
            'courses' => DB::table('courses')
                ->where('archive_id', $archiveId)
                ->orderBy('sort_order')
                ->get(),
        ];
    }

    private function studentSummary(Student $student, bool $includeArchiveName = false): array
    {
        return [
            'id' => $student->id,
            'full_name' => $student->full_name,
            'login_code' => trim((string) ($student->archived_login_code ?: $student->login_code)),
            'created_at' => optional($student->created_at)?->toISOString(),
            'archive_id' => $student->archive_id,
            ...($includeArchiveName ? ['archive_name' => $student->archive_name] : []),
            'branch' => $student->branch ? [
                'id' => $student->branch->code,
                'name' => $student->branch->name,
            ] : null,
            ...($includeArchiveName ? ['completionStatus' => $student->completion_status] : []),
        ];
    }
}
