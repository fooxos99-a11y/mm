<?php

namespace App\Services\Concerns;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Validation\ValidationException;

trait AuthorizesFinalExamAccess
{
    private function assertCanManageBranch(string $branchCode): void
    {
        $role = $this->currentActorRole();

        if ($role === 'admin') {
            return;
        }

        $managedBranch = match ($role) {
            'male_manager' => 'male',
            'female_manager' => 'female',
            default => '',
        };

        if ($managedBranch === '' || $branchCode !== $managedBranch) {
            throw new AuthorizationException;
        }
    }

    private function currentActorRole(): string
    {
        return (string) ((auth('sanctum')->user() ?: auth()->user())?->role ?? '');
    }

    private function normalizeBranchCode(string $branchCode): string
    {
        $branchCode = trim($branchCode);

        if (! in_array($branchCode, ['male', 'female'], true)) {
            throw ValidationException::withMessages(['branchCode' => 'رمز الفرع غير صالح.']);
        }

        return $branchCode;
    }
}
