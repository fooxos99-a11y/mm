<?php

namespace App\Services;

use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class StudentPartsService
{
    public function __construct(
        private readonly ReciterAccessService $access,
        private readonly UserManagementService $people,
    ) {
    }

    public function completeAll(User $user, Student $student, ?string $reciterId): array
    {
        $this->access->assertCanToggleStudentPart($user, $student, $reciterId);

        return DB::transaction(function () use ($user, $student, $reciterId): array {
            $student = Student::query()->whereKey($student->id)->lockForUpdate()->firstOrFail();
            abort_unless($student->archive_id === null, 404);
            $this->access->assertCanToggleStudentPart($user, $student, $reciterId);
            $parts = range(1, $student->branch?->code === 'female' ? 10 : 30);
            $completed = $student->parts()->pluck('part_number')->all();
            foreach (array_diff($parts, $completed) as $part) {
                $this->people->toggleStudentPart($student->id, $reciterId, $part, true);
            }

            return $parts;
        });
    }
}
