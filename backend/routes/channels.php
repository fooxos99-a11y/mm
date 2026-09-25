<?php

use App\Models\Reciter;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('dashboard.notifications.admin', fn (User $user): bool => $user->role === 'admin');
Broadcast::channel('dashboard.activity.admin', fn (User $user): bool => $user->role === 'admin');
Broadcast::channel('dashboard.notifications.all', fn (User $user): bool => in_array($user->role, ['admin', 'male_manager', 'female_manager'], true));
Broadcast::channel('dashboard.notifications.user.{loginCode}', fn (User $user, string $loginCode): bool => hash_equals((string) $user->login_code, $loginCode));
Broadcast::channel('dashboard.notifications.{branchCode}', function (User $user, string $branchCode): bool {
    if (! in_array($branchCode, ['male', 'female'], true)) {
        return false;
    }

    if ($user->role === 'admin') {
        return true;
    }

    if ($user->role === 'male_manager') {
        return $branchCode === 'male';
    }

    if ($user->role === 'female_manager') {
        return $branchCode === 'female';
    }

    if (in_array($user->role, ['student', 'trainee'], true)) {
        return Student::query()
            ->where('login_code', $user->login_code)
            ->join('branches', 'branches.id', '=', 'students.branch_id')
            ->where('branches.code', $branchCode)
            ->exists();
    }

    return $user->role === 'reciter'
        && Reciter::query()
            ->where('user_id', $user->id)
            ->join('branches', 'branches.id', '=', 'reciters.branch_id')
            ->where('branches.code', $branchCode)
            ->exists();
});
