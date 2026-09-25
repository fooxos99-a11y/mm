<?php

namespace App\Services;

use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ManualAttendanceService
{
    public function save(User $user, string $courseId, array $presentStudents, ?string $branchCode = null): void
    {
        $managedBranch = match ($user->role) {
            'male_manager' => 'male',
            'female_manager' => 'female',
            'admin' => null,
            default => abort(403),
        };
        abort_if($managedBranch !== null && $branchCode !== null && $branchCode !== $managedBranch, 403);
        $branchCode = $managedBranch ?? $branchCode;

        DB::transaction(function () use ($courseId, $presentStudents, $branchCode): void {
            // Serialize replacements for the same course before deleting any attendance.
            $course = DB::table('courses')->where('id', $courseId)->whereNull('archive_id')->lockForUpdate()->first();
            if (! $course) {
                throw ValidationException::withMessages(['courseId' => 'الدورة المحددة غير موجودة أو مؤرشفة.']);
            }

            $logins = collect($presentStudents)->pluck('loginId');
            $students = Student::query()->whereNull('archive_id')->with('branch')
                ->whereIn('login_code', $logins)->get()->keyBy('login_code');
            if ($students->count() !== $logins->count()) {
                throw ValidationException::withMessages(['presentStudents' => 'تتضمن قائمة الحضور حسابًا غير صالح أو مكررًا.']);
            }
            if ($branchCode !== null) {
                abort_if($students->contains(fn (Student $student) => $student->branch?->code !== $branchCode), 403);
            }

            $attendance = DB::table('course_attendance')->where('course_id', $courseId)->whereNull('archive_id');
            if ($branchCode !== null) {
                $attendance->whereIn('login_code', Student::query()->select('login_code')->whereNull('archive_id')
                    ->whereHas('branch', fn ($query) => $query->where('code', $branchCode)));
            }
            $attendance->delete();

            if ($students->isNotEmpty()) {
                DB::table('course_attendance')->insert($students->map(fn (Student $student) => [
                    'id' => (string) str()->uuid(),
                    'course_id' => $courseId,
                    'student_id' => $student->id,
                    'student_name' => $student->full_name,
                    'login_code' => $student->login_code,
                    'source' => 'manual',
                    'created_at' => now(),
                ])->values()->all());
            }
        });
    }
}
