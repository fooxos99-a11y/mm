<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\DepartmentContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class UserFactoryIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_generated_fixture_account_cannot_collide_with_a_manually_reserved_login_number(): void
    {
        DepartmentContext::reset();
        $manual = User::factory()->create(['login_code' => '9000', 'email' => 'manual-owner@example.test']);
        $manual->delete();

        // This seed makes the previous four-digit factory generate the reserved 9000.
        // Faker cannot track numbers supplied explicitly by other fixtures.
        fake()->unique(true);
        fake()->seed(3810);
        try {
            $generated = User::factory()->create();
            $this->assertNotSame('9000', $generated->login_code);
            $this->assertDatabaseHas('reserved_login_codes', ['login_code' => '9000', 'user_id' => $manual->id]);
            $this->assertDatabaseHas('reserved_login_codes', ['login_code' => $generated->login_code, 'user_id' => $generated->id]);
        } finally {
            fake()->seed();
            fake()->unique(true);
            DepartmentContext::reset();
        }
    }
}
