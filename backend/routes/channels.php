<?php

use App\Models\Reciter;
use App\Models\Student;
use App\Models\User;
use App\Support\DepartmentContext;
use Illuminate\Support\Facades\Broadcast;

$belongsToDepartment = static function (User $user, string $departmentId): bool {
    if (! $user->is_active) {
        return false;
    }

    return (string) $user->department_id === $departmentId
        || ($user->role === 'super_admin' && DepartmentContext::id() === $departmentId);
};

Broadcast::channel('departments.{departmentId}.dashboard.notifications.admin',
    fn (User $user, string $departmentId): bool => $belongsToDepartment($user, $departmentId)
        && DepartmentContext::effectiveRole((string) $user->role) === 'admin');
Broadcast::channel('departments.{departmentId}.dashboard.activity.admin',
    fn (User $user, string $departmentId): bool => $belongsToDepartment($user, $departmentId)
        && DepartmentContext::effectiveRole((string) $user->role) === 'admin');
Broadcast::channel('departments.{departmentId}.dashboard.notifications.all',
    fn (User $user, string $departmentId): bool => $belongsToDepartment($user, $departmentId)
        && in_array(DepartmentContext::effectiveRole((string) $user->role), ['admin', 'male_manager', 'female_manager'], true));
Broadcast::channel('departments.{departmentId}.dashboard.notifications.user.{loginCode}',
    fn (User $user, string $departmentId, string $loginCode): bool => $belongsToDepartment($user, $departmentId)
        && hash_equals((string) $user->login_code, $loginCode));
Broadcast::channel('departments.{departmentId}.dashboard.notifications.{branchCode}',
    function (User $user, string $departmentId, string $branchCode) use ($belongsToDepartment): bool {
        if (! $belongsToDepartment($user, $departmentId) || ! in_array($branchCode, ['male', 'female'], true)) {
            return false;
        }

        $role = DepartmentContext::effectiveRole((string) $user->role);
        if ($role === 'admin') {
            return true;
        }
        if (in_array($role, ['male_manager', 'female_manager'], true)) {
            return $branchCode === ($role === 'female_manager' ? 'female' : 'male');
        }

        return DepartmentContext::run($departmentId, function () use ($user, $role, $branchCode): bool {
            if (in_array($role, ['student', 'trainee'], true)) {
                return Student::query()->where('login_code', $user->login_code)
                    ->join('branches', 'branches.id', '=', 'students.branch_id')
                    ->where('branches.code', $branchCode)->exists();
            }

            return $role === 'reciter' && Reciter::query()->where('user_id', $user->id)
                ->join('branches', 'branches.id', '=', 'reciters.branch_id')
                ->where('branches.code', $branchCode)->exists();
        });
    });
