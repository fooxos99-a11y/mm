<?php

namespace App\Services\Concerns;

use App\Models\Reciter;
use App\Models\Student;
use App\Models\User;
use App\Services\ManagedPasswordService;
use App\Support\DepartmentContext;
use App\Support\DepartmentData as DB;
use Illuminate\Support\Facades\DB as GlobalDB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

trait ManagesStudents
{
    public function updateStudent(Student $student, array $updates): Student
    {
        abort_unless($student->department_id === DepartmentContext::id(), 404);
        $payload = [];
        $originalLoginCode = $student->login_code;
        $passwordHash = filled($updates['password'] ?? null) ? Hash::make((string) $updates['password']) : null;

        if (array_key_exists('name', $updates)) {
            $payload['full_name'] = trim((string) $updates['name']);
        }

        if (array_key_exists('loginCode', $updates)) {
            $nextLoginCode = trim((string) $updates['loginCode']);
            $exists = GlobalDB::table('students')
                ->where('login_code', $nextLoginCode)
                ->where('id', '!=', $student->getKey())
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages(['loginCode' => 'رقم الدخول مستخدم مسبقًا.']);
            }

            $userExists = User::query()
                ->where('login_code', $nextLoginCode)
                ->where(function ($query) use ($originalLoginCode): void {
                    $query->where('role', '!=', 'student')
                        ->orWhere('login_code', '!=', $originalLoginCode);
                })
                ->exists();

            if ($userExists) {
                throw ValidationException::withMessages(['loginCode' => 'رقم الدخول مستخدم مسبقًا.']);
            }

            $accountId = User::query()->where('department_id', DepartmentContext::id())
                ->where('login_code', $originalLoginCode)->where('role', 'student')->value('id');
            $reservedForAnotherAccount = GlobalDB::table('reserved_login_codes')->where('login_code', $nextLoginCode)
                ->when($accountId, fn ($query) => $query->where(function ($query) use ($accountId): void {
                    $query->whereNull('user_id')->orWhere('user_id', '!=', $accountId);
                }))->exists();
            if ($nextLoginCode !== $originalLoginCode && $reservedForAnotherAccount) {
                throw ValidationException::withMessages(['loginCode' => 'رقم الدخول مستخدم مسبقًا.']);
            }

            $payload['login_code'] = $nextLoginCode;
        }

        if (array_key_exists('note', $updates)) {
            $payload['note'] = (string) $updates['note'];
        }

        if (array_key_exists('isCertified', $updates)) {
            $payload['is_certified'] = (bool) $updates['isCertified'];
        }

        if (array_key_exists('branchId', $updates)) {
            $payload['branch_id'] = $this->findBranchByCode((string) $updates['branchId'])->id;
        }

        DB::transaction(function () use (
            $student,
            $payload,
            $updates,
            $passwordHash
        ): void {
            $lockedStudent = Student::query()->whereKey($student->id)->lockForUpdate()->firstOrFail();
            abort_unless($lockedStudent->archive_id === null, 404);
            $student->setRawAttributes($lockedStudent->getAttributes(), true);
            $originalLoginCode = $student->login_code;
            $originalName = $student->full_name;
            $user = $this->studentAccountForUpdate($student);

            if ($payload !== []) {
                $student->fill($payload);
                $student->save();
            }

            $student->unsetRelation('branch');
            $student->loadMissing('branch');
            $partsLimit = $student->branch?->code === 'female' ? 10 : 30;

            $targetLoginCode = $payload['login_code'] ?? $originalLoginCode;
            $targetName = $payload['full_name'] ?? $originalName;

            $user->fill([
                'department_id' => DepartmentContext::id(),
                'full_name' => $targetName,
                'role' => $user->exists ? $user->role : 'student',
                'must_change_password' => false,
                'login_code' => $targetLoginCode,
                'password' => $passwordHash ?: ($user->password ?: Hash::make(Str::random(64))),
            ])->save();
            app(ManagedPasswordService::class)->remember($user, $updates['password'] ?? null);

            if (array_key_exists('completedParts', $updates) && is_array($updates['completedParts'])) {
                $student->parts()->delete();

                $parts = collect($updates['completedParts'])
                    ->map(fn ($value) => (int) $value)
                    ->filter(fn (int $partNumber) => $partNumber >= 1 && $partNumber <= $partsLimit)
                    ->unique()
                    ->sort()
                    ->values();

                foreach ($parts as $partNumber) {
                    DB::table('student_parts')->insert([
                        'student_id' => $student->id,
                        'part_number' => $partNumber,
                        'marked_by_reciter_id' => null,
                        'marked_at' => now(),
                    ]);
                }
            } elseif ($partsLimit === 10) {
                $student->parts()->where('part_number', '>', $partsLimit)->delete();
            }
        }, 3);

        return $student->fresh(['branch', 'parts']);
    }

    private function studentAccountForUpdate(Student $student): User
    {
        $loginCode = (string) $student->login_code;
        $user = User::query()->where('login_code', $loginCode)->lockForUpdate()->first();
        if ($user) {
            if ($user->department_id !== DepartmentContext::id() || ! in_array($user->role, ['student', 'trainee'], true)) {
                throw ValidationException::withMessages(['loginCode' => 'رقم الدخول مستخدم مسبقًا.']);
            }
            DB::reserveLoginCode($loginCode, $user->id, DepartmentContext::id());

            return $user;
        }

        // Only an active, uniquely identified legacy student can acquire its own provisional number.
        $conflictingStudent = GlobalDB::table('students')->where('id', '!=', $student->id)
            ->where(function ($query) use ($loginCode): void {
                $query->where('login_code', $loginCode)->orWhere('archived_login_code', $loginCode);
            })->exists();
        if (trim($loginCode) === '' || $conflictingStudent) {
            throw ValidationException::withMessages(['loginCode' => 'رقم الدخول مستخدم مسبقًا.']);
        }

        $user = new User;
        $user->setAttribute($user->getKeyName(), $user->newUniqueId());
        GlobalDB::table('reserved_login_codes')->insertOrIgnore([
            'login_code' => $loginCode, 'user_id' => null,
            'department_id' => DepartmentContext::id(), 'created_at' => now(),
        ]);
        $reservation = GlobalDB::table('reserved_login_codes')->where('login_code', $loginCode)->lockForUpdate()->first();
        if ($reservation->user_id !== null || $reservation->department_id !== DepartmentContext::id()) {
            throw ValidationException::withMessages(['loginCode' => 'رقم الدخول مستخدم مسبقًا.']);
        }
        $claimed = GlobalDB::table('reserved_login_codes')->where('login_code', $loginCode)
            ->whereNull('user_id')->where('department_id', DepartmentContext::id())->update(['user_id' => $user->id]);
        if ($claimed !== 1) {
            throw ValidationException::withMessages(['loginCode' => 'رقم الدخول مستخدم مسبقًا.']);
        }

        return $user;
    }

    public function deleteStudent(Student $student): void
    {
        abort_unless($student->department_id === DepartmentContext::id(), 404);
        DB::transaction(function () use ($student): void {
            User::query()->where('department_id', DepartmentContext::id())
                ->where('login_code', $student->login_code)->where('role', 'student')->delete();
            $student->delete();
        });
    }

    public function getStudentAssignedReciterByLoginCode(string $loginCode): ?array
    {
        $loginCode = trim($loginCode);

        if ($loginCode === '') {
            return null;
        }

        $student = Student::query()
            ->with(['reciters.user'])
            ->where('login_code', $loginCode)
            ->first();

        if (! $student) {
            return null;
        }

        $reciter = $student->reciters->first();

        if (! $reciter) {
            return null;
        }

        return [
            'id' => $reciter->id,
            'name' => $reciter->full_name ?: ($reciter->user?->full_name ?? ''),
            'phone' => $reciter->phone,
            'loginCode' => $reciter->user?->login_code ?? '',
        ];
    }

    public function transferStudentToReciter(string $studentId, string $targetReciterId): void
    {
        $studentId = trim($studentId);
        $targetReciterId = trim($targetReciterId);

        if ($studentId === '' || $targetReciterId === '') {
            throw ValidationException::withMessages(['studentId' => 'بيانات النقل غير مكتملة.']);
        }

        $student = Student::query()->find($studentId);
        $reciter = Reciter::query()->find($targetReciterId);

        if (! $student || ! $reciter) {
            throw ValidationException::withMessages(['studentId' => 'تعذر العثور على المعلم/ة أو المقرئ المحدد.']);
        }

        DB::transaction(function () use ($student, $reciter): void {
            DB::table('reciter_students')->where('student_id', $student->id)->delete();

            DB::table('reciter_students')->insert([
                'reciter_id' => $reciter->id,
                'student_id' => $student->id,
                'created_at' => now(),
            ]);
        });
    }

    public function toggleStudentPart(
        string $studentId,
        ?string $reciterId,
        int $partNumber,
        bool $shouldMarkComplete
    ): void {
        $student = Student::query()->with('branch')->find($studentId);
        $reciter = $reciterId ? Reciter::query()->find($reciterId) : null;

        if (! $student) {
            throw ValidationException::withMessages(['studentId' => 'تعذر العثور على المعلم/ة المحدد.']);
        }

        $partsLimit = $student->branch?->code === 'female' ? 10 : 30;

        if ($partNumber < 1 || $partNumber > $partsLimit) {
            throw ValidationException::withMessages(['partNumber' => 'رقم الجزء غير صالح لهذا الفرع.']);
        }

        if ($reciterId !== null && ! $reciter) {
            throw ValidationException::withMessages(['reciterId' => 'تعذر العثور على المقرئ المحدد.']);
        }

        if ($shouldMarkComplete) {
            DB::table('student_parts')->updateOrInsert(
                ['student_id' => $student->id, 'part_number' => $partNumber],
                ['marked_by_reciter_id' => $reciter?->id, 'marked_at' => now()],
            );

            return;
        }

        DB::table('student_parts')
            ->where('student_id', $student->id)
            ->where('part_number', $partNumber)
            ->delete();
    }
}
