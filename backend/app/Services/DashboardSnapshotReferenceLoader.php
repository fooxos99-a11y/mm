<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\TrainingMaterial;
use Illuminate\Support\Collection;

class DashboardSnapshotReferenceLoader
{
    public function load(
        string $managedBranchId,
        bool $restrictStudentData,
        Collection $visibleBranchCodes,
    ): array {
        $trainingMaterialsQuery = TrainingMaterial::query()
            ->with('media')
            ->orderByDesc('created_at');

        if ($managedBranchId !== '') {
            $trainingMaterialsQuery->where(fn ($query) => $query
                ->whereNull('target_branch_code')
                ->orWhereIn('target_branch_code', [$managedBranchId, 'supervision']));
        } elseif ($restrictStudentData) {
            $trainingMaterialsQuery->where(fn ($query) => $query
                ->whereNull('target_branch_code')
                ->orWhereIn('target_branch_code', $visibleBranchCodes->all()));
        }

        return [
            'branches' => Branch::query()->orderBy('created_at')->get(),
            'rolePermissions' => collect(),
            'trainingMaterials' => $trainingMaterialsQuery->get(),
        ];
    }
}
