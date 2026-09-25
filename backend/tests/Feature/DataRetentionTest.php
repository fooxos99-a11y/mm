<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DataRetentionTest extends TestCase
{
    use RefreshDatabase;

    public function test_retention_command_prunes_only_expired_rows(): void
    {
        DB::table('registration_requests')->insert([
            [
                'id' => (string) str()->uuid(),
                'full_name' => 'Expired rejected request',
                'login_code' => 'retention-old',
                'branch_code' => 'male',
                'status' => 'rejected',
                'created_at' => now()->subDays(100),
                'updated_at' => now()->subDays(100),
            ],
            [
                'id' => (string) str()->uuid(),
                'full_name' => 'Recent rejected request',
                'login_code' => 'retention-new',
                'branch_code' => 'male',
                'status' => 'rejected',
                'created_at' => now()->subDays(10),
                'updated_at' => now()->subDays(10),
            ],
        ]);
        DB::table('sessions')->insert([
            'id' => 'expired-session',
            'payload' => '',
            'last_activity' => now()->subDays(31)->timestamp,
        ]);

        $this->artisan('data-retention:prune')->assertSuccessful();

        $this->assertDatabaseMissing('registration_requests', ['login_code' => 'retention-old']);
        $this->assertDatabaseHas('registration_requests', ['login_code' => 'retention-new']);
        $this->assertDatabaseHas('sessions', ['id' => 'expired-session']);
    }
}
