<?php

namespace App\Services\Concerns;

use App\Models\Branch;
use Illuminate\Validation\ValidationException;

trait ResolvesUserManagementBranches
{
    private function findBranchByCode(string $branchCode): Branch
    {
        $branch = Branch::query()->where('code', $branchCode)->first();

        if (! $branch) {
            throw ValidationException::withMessages(['branchId' => 'Invalid branch.']);
        }

        return $branch;
    }
}
