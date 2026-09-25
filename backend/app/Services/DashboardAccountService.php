<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class DashboardAccountService
{
    public function list(): array
    {
        return User::query()
            ->whereIn('role', ['admin', 'male_manager', 'female_manager'])
            ->orderBy('created_at')
            ->get()
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->full_name,
                'loginCode' => $user->login_code ?? '',
                'role' => $user->role,
            ])
            ->all();
    }

    public function create(string $name, string $loginCode, string $role, string $password): User
    {
        $name = trim($name);
        $loginCode = trim($loginCode);

        if ($name === '' || $loginCode === '') {
            throw ValidationException::withMessages(['login_code' => 'أدخل الاسم ورقم الدخول.']);
        }

        if (! in_array($role, ['admin', 'male_manager', 'female_manager'], true)) {
            throw ValidationException::withMessages(['role' => 'نوع الحساب الإشرافي غير صالح.']);
        }

        if (User::query()->where('login_code', $loginCode)->exists()) {
            throw ValidationException::withMessages(['login_code' => 'رقم الدخول مستخدم مسبقًا.']);
        }

        return User::query()->create([
            'full_name' => $name,
            'role' => $role,
            'login_code' => $loginCode,
            'password' => Hash::make($password),
            'must_change_password' => true,
        ]);
    }

    public function delete(string $accountId): void
    {
        User::query()
            ->whereKey($accountId)
            ->whereIn('role', ['admin', 'male_manager', 'female_manager'])
            ->delete();
    }
}
