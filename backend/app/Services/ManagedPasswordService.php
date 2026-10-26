<?php

namespace App\Services;

use App\Models\Reciter;
use App\Models\Student;
use App\Models\User;
use App\Support\DepartmentContext;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class ManagedPasswordService
{
    public function rememberStudent(Student $student, ?string $password): void
    {
        $user = User::query()->where('department_id', DepartmentContext::id())
            ->where('login_code', $student->login_code)->whereIn('role', ['student', 'trainee'])->first();
        $this->remember($user, $password);
    }

    public function remember(?User $user, ?string $password): void
    {
        if (! $user || $password === null || $password === '') {
            return;
        }
        if (! Hash::check($password, $user->password)) {
            throw new \LogicException('Managed credential does not match the saved account.');
        }
        DB::table('student_initial_credentials')->updateOrInsert(['user_id' => $user->id], [
            'encrypted_password' => Crypt::encryptString($password), 'created_at' => now(),
        ]);
    }

    public function reveal(?User $user): ?string
    {
        if (! $user || $user->department_id !== DepartmentContext::id()) {
            return null;
        }
        $encrypted = DB::table('student_initial_credentials')->where('user_id', $user->id)->value('encrypted_password');
        $password = $encrypted ? Crypt::decryptString($encrypted) : null;

        return $password !== null && Hash::check($password, $user->password) ? $password : null;
    }

    public function revealPerson(string $type, string $id): ?string
    {
        if ($type === 'account') {
            $user = User::query()->where('department_id', DepartmentContext::id())
                ->whereIn('role', ['admin', 'male_manager', 'female_manager'])->findOrFail($id);
        } else {
            $person = ($type === 'reciter' ? Reciter::query() : Student::query())
                ->where('department_id', DepartmentContext::id())->whereNull('archive_id')->findOrFail($id);
            $user = $type === 'reciter' ? $person->user : User::query()
                ->where('department_id', DepartmentContext::id())->where('login_code', $person->login_code)
                ->whereIn('role', ['student', 'trainee'])->first();
        }

        return $this->reveal($user);
    }
}
