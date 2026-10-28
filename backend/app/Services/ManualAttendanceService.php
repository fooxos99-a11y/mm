<?php

namespace App\Services;

use App\Models\Student;
use App\Models\User;
use App\Support\DepartmentContext;
use App\Support\DepartmentData as DB;
use Illuminate\Validation\ValidationException;

class ManualAttendanceService
{
    public function save(User $user, string $courseId, array $presentStudents, ?string $branchCode = null, ?string $sessionId = null, array $removedStudents = []): void
    {
        $managedBranch = match (DepartmentContext::effectiveRole((string) $user->role)) {
            'male_manager' => 'male',
            'female_manager' => 'female',
            'admin' => null,
            default => abort(403),
        };
        abort_if($managedBranch !== null && $branchCode !== null && $branchCode !== $managedBranch, 403);
        $branchCode = $managedBranch ?? $branchCode;

        DB::transaction(function () use ($courseId, $presentStudents, $branchCode, $sessionId, $removedStudents): void {
            // Serialize replacements for the same course before deleting any attendance.
            $course = DB::table('courses')->where('id', $courseId)->whereNull('archive_id')->lockForUpdate()->first();
            if (! $course) {
                throw ValidationException::withMessages(['courseId' => 'الدورة المحددة غير موجودة أو مؤرشفة.']);
            }

            $presentLogins = collect($presentStudents)->pluck('loginId');
            if ($presentLogins->intersect($removedStudents)->isNotEmpty()) {
                throw ValidationException::withMessages(['removedStudents' => 'لا يمكن تحضير الطالب وإلغاء حضوره في الطلب نفسه.']);
            }
            $logins = $presentLogins->concat($removedStudents);
            StudentIdentityGuard::assertAllowed($logins->all(), 'presentStudents', true);
            $students = Student::query()->whereNull('archive_id')->with('branch')
                ->whereIn('login_code', $logins)->get()->keyBy('login_code');
            if ($students->count() !== $logins->count()) {
                throw ValidationException::withMessages(
                    ['presentStudents' => 'تتضمن قائمة الحضور حسابًا غير صالح أو مكررًا.']
                );
            }
            if ($branchCode !== null) {
                abort_if($students->contains(fn (Student $student) => $student->branch?->code !== $branchCode), 403);
            }

            if ($sessionId !== null) {
                abort_if(($course->entity_type ?? '') === 'task', 422);
                $sessions = app(AttendanceSessionService::class);
                $session = $sessions->session($courseId, $sessionId, requireOpen: false);
                // Supervisors may prepare any teacher in their branch; enrollment gates self attendance only.
                // Only explicit removals change existing attendance; stale checklists cannot erase new self attendance.
                DB::table('course_attendance')->where('session_id', $sessionId)->whereIn('login_code', $removedStudents)->delete();
                foreach ($students->whereIn('login_code', $presentLogins) as $student) {
                    if (! DB::table('course_attendance')->where('session_id', $sessionId)->where('student_id', $student->id)->exists()) {
                        $sessions->record($student, $session, 'manual');
                    }
                }

                return;
            }
            abort_if(DB::table('attendance_sessions')->where('course_id', $courseId)->exists(), 422, 'اختر جلسة التحضير.');

            $attendance = DB::table('course_attendance')->where('course_id', $courseId)->whereNull('archive_id')->whereNull('session_id');
            if ($branchCode !== null) {
                $branchLoginCodes = Student::query()->select('login_code')->whereNull('archive_id')
                    ->whereHas('branch', fn ($query) => $query->where('code', $branchCode));
                $attendance->whereIn('login_code', $branchLoginCodes);
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
