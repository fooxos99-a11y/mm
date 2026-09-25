<?php

namespace App\Services;

use App\Models\Student;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class DashboardDatasetService
{
    private const DATASETS = [
        'submissions' => ['table' => 'course_submissions', 'order' => 'submitted_at'],
        'attendance' => ['table' => 'course_attendance', 'order' => 'created_at'],
        'satisfaction-responses' => ['table' => 'satisfaction_responses', 'order' => 'submitted_at'],
        'final-exam-submissions' => ['table' => 'final_exam_submissions', 'order' => 'submitted_at'],
    ];

    public function paginate(string $dataset, User $user, int $perPage, array $filters = []): LengthAwarePaginator
    {
        $definition = self::DATASETS[$dataset];
        $query = DB::table($definition['table'])
            ->whereNull('archive_id')
            ->orderByDesc($definition['order'])
            ->orderByDesc('id');

        if (($filters['loginCode'] ?? '') !== '') {
            $query->where('login_code', $filters['loginCode']);
        }

        if (($filters['courseId'] ?? '') !== '' && in_array($dataset, ['submissions', 'attendance', 'satisfaction-responses'], true)) {
            $query->where('course_id', $filters['courseId']);
        }

        if (($filters['assessmentType'] ?? '') !== '' && $dataset === 'submissions') {
            $query->where('assessment_type', $filters['assessmentType']);
        }

        if (($filters['branchCode'] ?? '') !== '' && $dataset === 'final-exam-submissions') {
            $query->where('branch_code', $filters['branchCode']);
        }

        if ($user->role !== 'admin') {
            $managedBranchId = match ($user->role) {
                'male_manager' => 'male',
                'female_manager' => 'female',
                default => '',
            };
            $visibleStudents = Student::query()
                ->select('login_code')
                ->whereNull('archive_id');

            if ($managedBranchId !== '') {
                $visibleStudents->whereHas('branch', fn ($branch) => $branch->where('code', $managedBranchId));
            } elseif (in_array($user->role, ['student', 'trainee'], true)) {
                $visibleStudents->where('login_code', $user->login_code);
            } elseif ($user->role === 'reciter') {
                $visibleStudents->whereHas(
                    'reciters.user',
                    fn ($owner) => $owner->where('login_code', $user->login_code),
                );
            } else {
                $visibleStudents->whereRaw('1 = 0');
            }

            $query->whereIn('login_code', $visibleStudents);
        }

        return $query->paginate($perPage)->withQueryString();
    }
}
