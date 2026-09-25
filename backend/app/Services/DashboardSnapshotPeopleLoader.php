<?php

namespace App\Services;

use App\Models\Reciter;
use App\Models\Student;
use Illuminate\Support\Collection;

class DashboardSnapshotPeopleLoader
{
    /**
     * Load only people visible to the authenticated role before dependent
     * submissions, attendance and answers are queried.
     *
     * @return array{0: Collection<int, Student>, 1: Collection<int, Reciter>}
     */
    public function load(string $role, string $loginCode, string $managedBranchId): array
    {
        $studentQuery = Student::query()
            ->whereNull('archive_id')
            ->with(['branch', 'parts', 'registrationRequest'])
            ->orderBy('created_at');
        $reciterQuery = Reciter::query()
            ->whereNull('archive_id')
            ->with([
                'user',
                'branch',
                'students' => fn ($query) => $query
                    ->whereNull('students.archive_id')
                    ->orderBy('students.created_at'),
            ])
            ->orderBy('created_at');

        if ($role === 'admin') {
            return [$studentQuery->get(), $reciterQuery->get()];
        }

        if ($managedBranchId !== '') {
            $studentQuery->whereHas('branch', fn ($query) => $query->where('code', $managedBranchId));
            $reciterQuery->whereHas('branch', fn ($query) => $query->where('code', $managedBranchId));

            return [$studentQuery->get(), $reciterQuery->get()];
        }

        if (in_array($role, ['student', 'trainee'], true)) {
            return [
                $studentQuery->where('login_code', $loginCode)->get(),
                collect(),
            ];
        }

        if ($role === 'reciter') {
            $reciters = $reciterQuery
                ->whereHas('user', fn ($query) => $query->where('login_code', $loginCode))
                ->with(['students' => fn ($query) => $query
                    ->whereNull('students.archive_id')
                    ->with(['branch', 'parts', 'registrationRequest'])
                    ->orderBy('students.created_at')])
                ->get();
            $students = $reciters->first()?->students?->values() ?? collect();

            return [$students, $reciters];
        }

        return [collect(), collect()];
    }
}
