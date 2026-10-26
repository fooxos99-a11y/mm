<?php

namespace App\Services;

use App\Models\Reciter;
use App\Models\Student;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class ManagedPeopleAccountService
{
    public function __construct(
        private readonly StudentAccountService $students,
        private readonly UserManagementService $people,
        private readonly ManagedPasswordService $passwords,
    ) {
    }

    public function createStudent(array $data): Student
    {
        return DB::transaction(function () use ($data): Student {
            $student = $this->students->create($data['name'], $data['loginId'], $data['branchId'], $data['note'] ?? '',
                filled($data['password'] ?? null) ? Hash::make($data['password']) : null);
            $this->passwords->rememberStudent($student, $data['password'] ?? null);

            return $student;
        });
    }

    public function saveReciter(array $data): Reciter
    {
        return DB::transaction(function () use ($data): Reciter {
            $reciter = $this->people->saveReciter($data['currentLoginCode'] ?? null, $data['name'], $data['loginCode'],
                $data['branchId'], $data['linkedStudentIds'] ?? [],
                filled($data['password'] ?? null) ? Hash::make($data['password']) : null,
                array_intersect_key($data, ['phone' => true]));
            $this->passwords->remember($reciter->user, $data['password'] ?? null);

            return $reciter;
        });
    }
}
