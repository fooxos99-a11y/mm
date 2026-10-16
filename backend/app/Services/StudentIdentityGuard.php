<?php

namespace App\Services;

use App\Support\DepartmentContext;
use App\Support\DepartmentData;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Keep legacy unnamed imports possible without borrowing an existing account's identity. */
final class StudentIdentityGuard
{
    public static function assertAllowed(array|string $loginCodes, string $field, bool $reserve = false): void
    {
        $codes = collect((array) $loginCodes)->map(fn ($code): string => trim((string) $code))
            ->filter()->unique()->values();
        if ($codes->isEmpty()) {
            return;
        }
        $departmentId = DepartmentContext::id();
        abort_unless($departmentId !== null, 403);

        if ($reserve) {
            // The unique number is claimed before writing results. A competing department
            // waits on this row and must then reject the first owner's reservation.
            foreach ($codes->sort()->values() as $code) {
                DB::table('reserved_login_codes')->insertOrIgnore([
                    'login_code' => $code, 'user_id' => null,
                    'department_id' => $departmentId, 'created_at' => now(),
                ]);
                $reservation = DB::table('reserved_login_codes')->where('login_code', $code)->lockForUpdate()->first();
                if (! $reservation || $reservation->department_id !== $departmentId) {
                    self::reject($field);
                }
            }
        }

        $foreignUsers = DB::table('users')->whereIn('login_code', $codes)
            ->where(fn (Builder $query) => $query->whereNull('department_id')->orWhere('department_id', '!=', $departmentId));
        $foreignStudents = DB::table('students')->where('department_id', '!=', $departmentId)
            ->where(fn (Builder $query) => $query->whereIn('login_code', $codes)->orWhereIn('archived_login_code', $codes));
        if ($foreignUsers->exists() || $foreignStudents->exists()) {
            self::reject($field);
        }
        foreach (['course_submissions', 'final_exam_submissions', 'satisfaction_responses', 'course_attendance'] as $table) {
            if (DB::table($table)->whereIn('login_code', $codes)->where('department_id', '!=', $departmentId)->exists()) {
                self::reject($field);
            }
        }

        $localStudents = DepartmentData::table('students')->whereNull('archive_id')->whereIn('login_code', $codes);
        $activeCodes = $localStudents->pluck('login_code');
        $unmatched = $codes->diff($activeCodes)->values();
        if ($unmatched->isEmpty()) {
            return;
        }
        // A known account or historical reservation cannot become an anonymous imported learner.
        if (DB::table('users')->whereIn('login_code', $unmatched)->exists()
            || DB::table('students')->where(fn (Builder $query) => $query
                ->whereIn('login_code', $unmatched)->orWhereIn('archived_login_code', $unmatched))->exists()
            || DB::table('reserved_login_codes')->whereIn('login_code', $unmatched)
                ->where(fn (Builder $query) => $query->whereNull('department_id')
                    ->orWhere('department_id', '!=', $departmentId)->orWhereNotNull('user_id'))->exists()) {
            self::reject($field);
        }
    }

    private static function reject(string $field): never
    {
        throw ValidationException::withMessages([$field => 'رقم الدخول لا يتبع معلمًا نشطًا في هذه الإدارة.']);
    }
}
