<?php

namespace App\Services\Concerns;

use App\Models\Reciter;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

trait ManagesStudents
{
    public function updateStudent(Student $student, array $updates): Student
    {
        $payload = [];
        $originalLoginCode = $student->login_code;
        $originalName = $student->full_name;
        $passwordHash = filled($updates['password'] ?? null) ? Hash::make((string) $updates['password']) : null;

        if (array_key_exists('name', $updates)) {
            $payload['full_name'] = trim((string) $updates['name']);
        }

        if (array_key_exists('loginCode', $updates)) {
            $nextLoginCode = trim((string) $updates['loginCode']);
            $exists = Student::query()
                ->where('login_code', $nextLoginCode)
                ->whereKeyNot($student->getKey())
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

        DB::transaction(function () use ($student, $payload, $updates, $originalLoginCode, $originalName, $passwordHash): void {
            if ($payload !== []) {
                $student->fill($payload);
                $student->save();
            }

            $student->loadMissing('branch');
            $partsLimit = $student->branch?->code === 'female' ? 10 : 30;

            $targetLoginCode = $payload['login_code'] ?? $originalLoginCode;
            $targetName = $payload['full_name'] ?? $originalName;

            $user = User::query()->updateOrCreate(
                ['login_code' => $originalLoginCode],
                [
                    'full_name' => $targetName,
                    'role' => 'student',
                    'login_code' => $targetLoginCode,
                    'password' => User::query()->where('login_code', $originalLoginCode)->value('password') ?: Hash::make(Str::random(64)),
                ],
            );

            if ($passwordHash) {
                $user->forceFill(['password' => $passwordHash])->save();
            }

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
        });

        return $student->fresh(['branch', 'parts']);
    }

    public function deleteStudent(Student $student): void
    {
        DB::transaction(function () use ($student): void {
            User::query()->where('login_code', $student->login_code)->where('role', 'student')->delete();
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

    public function toggleStudentPart(string $studentId, ?string $reciterId, int $partNumber, bool $shouldMarkComplete): void
    {
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
