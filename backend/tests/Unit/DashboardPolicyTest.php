<?php

namespace Tests\Unit;

use App\Models\User;
use App\Policies\DashboardPolicy;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class DashboardPolicyTest extends TestCase
{
    #[DataProvider('roles')]
    public function test_dashboard_access_is_limited_to_management_roles(string $role, bool $allowed): void
    {
        $user = new User(['role' => $role]);

        $this->assertSame($allowed, (new DashboardPolicy)->access($user));
    }

    public static function roles(): array
    {
        return [
            'admin' => ['admin', true],
            'male manager' => ['male_manager', true],
            'female manager' => ['female_manager', true],
            'student' => ['student', false],
            'reciter' => ['reciter', false],
            'unknown' => ['unknown', false],
        ];
    }
}
