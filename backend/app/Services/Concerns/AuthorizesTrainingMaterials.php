<?php

namespace App\Services\Concerns;

use App\Models\TrainingMaterial;
use Illuminate\Auth\Access\AuthorizationException;

trait AuthorizesTrainingMaterials
{
    private function writableBranchCode(?string $requestedBranchCode): ?string
    {
        if ($this->currentActorRole() === 'admin') {
            return $requestedBranchCode;
        }

        $managedBranch = $this->managedBranchCode();
        if ($managedBranch === null) {
            throw new AuthorizationException;
        }

        return $managedBranch;
    }

    private function assertCanManageMaterial(TrainingMaterial $material): void
    {
        if ($this->currentActorRole() === 'admin') {
            return;
        }

        if ($this->managedBranchCode() === null || $material->target_branch_code !== $this->managedBranchCode()) {
            throw new AuthorizationException;
        }
    }

    private function managedBranchCode(): ?string
    {
        return match ($this->currentActorRole()) {
            'male_manager' => 'male',
            'female_manager' => 'female',
            default => null,
        };
    }

    private function currentActorRole(): string
    {
        return (string) ((auth('sanctum')->user() ?: auth()->user())?->role ?? '');
    }
}
