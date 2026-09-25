<?php

namespace App\Services;

use App\Models\Reciter;
use App\Models\Student;
use App\Models\TrainingMaterial;
use App\Models\User;
use Symfony\Component\HttpFoundation\Response;

class TrainingMaterialAccessService
{
    public function assertCanView(?User $user, TrainingMaterial $material): void
    {
        $role = (string) ($user?->role ?? '');
        if ($role === 'admin') {
            return;
        }

        $materialBranch = (string) ($material->target_branch_code ?? '');
        if ($materialBranch === '') {
            return;
        }

        if ($materialBranch === 'supervision') {
            abort_unless(in_array($role, ['male_manager', 'female_manager', 'reciter'], true), Response::HTTP_FORBIDDEN);

            return;
        }

        abort_unless($this->userBranchCode($user) === $materialBranch, Response::HTTP_FORBIDDEN);
    }

    private function userBranchCode(?User $user): string
    {
        $role = (string) ($user?->role ?? '');

        if ($role === 'male_manager') {
            return 'male';
        }

        if ($role === 'female_manager') {
            return 'female';
        }

        if (in_array($role, ['student', 'trainee'], true)) {
            return (string) Student::query()
                ->where('login_code', $user?->login_code)
                ->join('branches', 'branches.id', '=', 'students.branch_id')
                ->value('branches.code');
        }

        if ($role === 'reciter') {
            return (string) Reciter::query()
                ->where('user_id', $user?->id)
                ->join('branches', 'branches.id', '=', 'reciters.branch_id')
                ->value('branches.code');
        }

        return '';
    }
}
