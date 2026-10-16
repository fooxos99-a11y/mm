<?php

namespace App\Policies;

use App\Models\User;
use App\Support\DepartmentContext;

final class DashboardPolicy
{
    public function access(User $user): bool
    {
        return in_array(DepartmentContext::effectiveRole($user->role), ['admin', 'male_manager', 'female_manager'], true);
    }
}
