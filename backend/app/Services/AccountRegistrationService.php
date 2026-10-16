<?php

namespace App\Services;

use App\Models\User;
use App\Support\DepartmentData;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

final class AccountRegistrationService
{
    public function register(array $data): User
    {
        try {
            return DB::transaction(function () use ($data): User {
                $loginCode = trim($data['loginCode']);
                if (User::query()->where('login_code', $loginCode)->exists()
                    || DB::table('reserved_login_codes')->where('login_code', $loginCode)->exists()) {
                    $this->duplicate();
                }
                $user = User::query()->create([
                    'full_name' => trim($data['name']), 'login_code' => $loginCode,
                    'password' => Hash::make($data['password']), 'role' => 'unassigned',
                    'department_id' => null, 'is_active' => true, 'must_change_password' => false,
                ]);
                DepartmentData::reserveLoginCode($loginCode, $user->id);

                return $user;
            });
        } catch (UniqueConstraintViolationException) {
            $this->duplicate();
        }
    }

    private function duplicate(): never
    {
        throw ValidationException::withMessages(['loginCode' => 'رقم الدخول مستخدم مسبقًا.']);
    }
}
