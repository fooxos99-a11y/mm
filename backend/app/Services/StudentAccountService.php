<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class StudentAccountService
{
    public function create(string $name, string $loginCode, string $branchCode, string $note, ?string $passwordHash): Student
    {
        $name = trim($name);
        $loginCode = trim($loginCode);
        $branch = $this->resolveBranch($branchCode);

        if ($name === '' || $loginCode === '') {
            throw ValidationException::withMessages(['login_code' => 'أدخل اسم المعلم/ة والفرع ورقم الدخول.']);
        }

        if (Student::query()->where('login_code', $loginCode)->exists() || User::query()->where('login_code', $loginCode)->exists()) {
            throw ValidationException::withMessages(['login_code' => 'رقم الدخول مستخدم مسبقًا.']);
        }

        return DB::transaction(function () use ($name, $loginCode, $branch, $note, $passwordHash): Student {
            $student = Student::query()->create([
                'full_name' => $name,
                'login_code' => $loginCode,
                'branch_id' => $branch->id,
                'note' => $note,
                'is_certified' => false,
            ]);

            User::query()->create([
                'full_name' => $name,
                'role' => 'student',
                'login_code' => $loginCode,
                'password' => $passwordHash ?: Hash::make(Str::random(64)),
                'must_change_password' => false,
            ]);

            return $student;
        });
    }

    private function resolveBranch(string $branchCode): Branch
    {
        $branch = Branch::query()->where('code', trim($branchCode))->first();

        if (! $branch) {
            throw ValidationException::withMessages(['branch_id' => 'الفرع المحدد غير موجود.']);
        }

        return $branch;
    }
}
