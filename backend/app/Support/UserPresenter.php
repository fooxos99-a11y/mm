<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\DB;

final class UserPresenter
{
    public static function serialize(User $user): array
    {
        $departmentId = $user->role === 'super_admin' ? DepartmentContext::id() : $user->department_id;
        $department = $departmentId ? DB::table('departments')->where('id', $departmentId)->first() : null;
        $role = DepartmentContext::effectiveRole($user->role);

        return [
            'id' => $user->id, 'name' => $user->full_name, 'role' => $role,
            'systemRole' => $user->role, 'loginCode' => $user->login_code ?? '',
            'mustChangePassword' => (bool) $user->must_change_password,
            'departmentId' => $departmentId, 'departmentName' => $department?->name,
            'roleLabel' => match ($role) {
                'super_admin' => 'المدير العام', 'admin' => $department?->manager_title ?: 'مسؤول الإدارة',
                'male_manager' => 'مشرف معلمين', 'female_manager' => 'مشرف معلمات',
                'reciter' => 'مقرئ', 'unassigned' => 'بانتظار التعيين', default => 'المعلم/ة',
            },
        ];
    }
}
