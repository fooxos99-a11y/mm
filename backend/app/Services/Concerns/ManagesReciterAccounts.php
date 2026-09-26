<?php

namespace App\Services\Concerns;

use App\Models\Reciter;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

trait ManagesReciterAccounts
{
    public function saveReciter(
        ?string $currentLoginCode,
        string $name,
        string $loginCode,
        string $branchCode,
        array $linkedStudentIds = [],
        ?string $passwordHash = null
    ): Reciter {
        $name = trim($name);
        $loginCode = trim($loginCode);
        $currentLoginCode = trim((string) $currentLoginCode);
        $branch = $this->findBranchByCode($branchCode);

        if ($name === '' || $loginCode === '') {
            throw ValidationException::withMessages(['login_code' => 'أدخل اسم المقرئ والفرع ورقم الدخول.']);
        }

        return DB::transaction(function () use (
            $currentLoginCode,
            $name,
            $loginCode,
            $branch,
            $linkedStudentIds,
            $passwordHash
        ): Reciter {
            $currentUser = $currentLoginCode === ''
                ? null
                : User::query()->where('login_code', $currentLoginCode)->where('role', 'reciter')->first();

            $targetUser = User::query()->where('login_code', $loginCode)->where('role', 'reciter')->first();
            $conflictingUser = User::query()->where('login_code', $loginCode)
                ->when($currentUser, fn ($query) => $query->whereKeyNot($currentUser->id))
                ->first();

            if ($conflictingUser || ($targetUser && (! $currentUser || $targetUser->id !== $currentUser->id))) {
                throw ValidationException::withMessages(['login_code' => 'رقم دخول المقرئ مستخدم مسبقًا.']);
            }

            $user = $currentUser ?? $targetUser;

            if ($user) {
                $user->update(array_filter([
                    'full_name' => $name,
                    'login_code' => $loginCode,
                    'role' => 'reciter',
                    'password' => $passwordHash,
                ], static fn ($value): bool => $value !== null));
            } else {
                $user = User::query()->create([
                    'full_name' => $name,
                    'role' => 'reciter',
                    'login_code' => $loginCode,
                    'password' => $passwordHash ?: Hash::make(Str::random(64)),
                ]);
            }

            $reciter = Reciter::query()->firstOrNew(['user_id' => $user->id]);
            $reciter->fill([
                'full_name' => $name,
                'user_id' => $user->id,
                'branch_id' => $branch->id,
            ]);
            $reciter->save();

            $validatedStudentIds = Student::query()
                ->whereIn('id', $linkedStudentIds)
                ->pluck('id')
                ->all();

            $reciter->students()->sync($validatedStudentIds);

            return $reciter->fresh(['user', 'branch', 'students.branch', 'students.parts']);
        });
    }

    public function deleteReciterByLoginCode(string $loginCode): ?string
    {
        $loginCode = trim($loginCode);

        if ($loginCode === '') {
            return null;
        }

        return DB::transaction(function () use ($loginCode): ?string {
            $user = User::query()->where('login_code', $loginCode)->where('role', 'reciter')->first();

            if (! $user) {
                return null;
            }

            $reciter = Reciter::query()->where('user_id', $user->id)->first();
            $reciterId = $reciter?->id;

            if ($reciter) {
                $reciter->students()->detach();
                $reciter->delete();
            }

            $user->delete();

            return $reciterId;
        });
    }

    public function getReciterAccountByLoginCode(string $loginCode): ?array
    {
        $loginCode = trim($loginCode);

        if ($loginCode === '') {
            return null;
        }

        $user = User::query()->where('login_code', $loginCode)->where('role', 'reciter')->first();

        if (! $user) {
            return null;
        }

        $reciter = Reciter::query()
            ->with(['students.branch', 'students.parts'])
            ->where('user_id', $user->id)
            ->first();

        if (! $reciter) {
            return [
                'id' => $user->id,
                'name' => $user->full_name,
                'loginCode' => $user->login_code,
                'students' => [],
            ];
        }

        return [
            'id' => $reciter->id,
            'name' => $reciter->full_name ?: $user->full_name,
            'loginCode' => $user->login_code,
            'branchId' => $reciter->branch?->code,
            'students' => $reciter->students
                ->map(fn (Student $student) => [
                    'id' => $student->id,
                    'name' => $student->full_name,
                    'loginId' => $student->login_code,
                    'branchId' => $student->branch?->code ?? 'male',
                    'note' => $student->note,
                    'completedParts' => $student->parts->pluck('part_number')->sort()->values()->all(),
                ])
                ->sortBy([
                    fn (array $student) => -count($student['completedParts']),
                    fn (array $student) => $student['name'],
                ], options: SORT_REGULAR)
                ->values()
                ->all(),
        ];
    }
}
