<?php

namespace App\Services;

use App\Models\Student;
use App\Models\User;
use App\Support\DepartmentContext;
use App\Support\DepartmentData as DB;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

class CourseEnrollmentService
{
    public function studentIds(User $user, string $courseId, string $branch): array
    {
        $this->assertBranch($user, $branch);
        $this->course($courseId);

        return DB::table('course_enrollments')->where('course_id', $courseId)
            ->whereIn('student_id', $this->students($branch)->select('id'))->pluck('student_id')->all();
    }

    public function save(User $user, string $courseId, string $branch, array $studentIds): array
    {
        $this->assertBranch($user, $branch);
        DB::transaction(function () use ($courseId, $branch, $studentIds): void {
            $this->course($courseId, true);
            $students = $this->students($branch)->whereIn('id', $studentIds)->lockForUpdate()->get();
            if ($students->count() !== count($studentIds)) {
                throw ValidationException::withMessages(['studentIds' => 'تتضمن القائمة طالبًا غير مسموح به أو غير مسجل في الفرع.']);
            }
            DB::table('course_enrollments')->where('course_id', $courseId)
                ->whereIn('student_id', $this->students($branch)->select('id'))
                ->whereNotIn('student_id', $studentIds)->delete();
            foreach ($students as $student) {
                if (! $this->contains($courseId, $student->id)) {
                    DB::table('course_enrollments')->insert(['id' => (string) str()->uuid(),
                        'course_id' => $courseId, 'student_id' => $student->id, 'created_at' => now()]);
                }
            }
        });

        return $this->studentIds($user, $courseId, $branch);
    }

    public function contains(string $courseId, string $studentId): bool
    {
        return DB::table('course_enrollments')->where('course_id', $courseId)->where('student_id', $studentId)->exists();
    }

    public function assertEnrolled(string $courseId, string $studentId): void
    {
        abort_unless($this->contains($courseId, $studentId), 403, 'الطالب غير مسجل في هذه الدورة.');
    }

    private function assertBranch(User $user, string $branch): void
    {
        $managed = match (DepartmentContext::effectiveRole($user->role)) {
            'admin' => $branch,
            'male_manager' => 'male',
            'female_manager' => 'female',
            default => abort(403),
        };
        abort_unless($branch === $managed, 403);
    }

    private function students(string $branch): Builder
    {
        return Student::query()->whereNull('archive_id')->whereHas('branch', fn ($query) => $query->where('code', $branch));
    }

    private function course(string $courseId, bool $lock = false): void
    {
        $query = DB::table('courses')->where('id', $courseId)->whereNull('archive_id')->where('entity_type', '!=', 'task');
        abort_unless(($lock ? $query->lockForUpdate() : $query)->first(), 404);
    }
}
