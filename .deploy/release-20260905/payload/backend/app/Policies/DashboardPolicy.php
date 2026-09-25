<?php

namespace App\Policies;

use App\Models\User;

final class DashboardPolicy
{
    public function access(User $user): bool
    {
        return in_array($user->role, ['admin', 'male_manager', 'female_manager'], true);
    }
}
