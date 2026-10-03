<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\DashboardAccountService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DashboardAccountLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_created_accounts_can_sign_in_repeatedly_without_a_password_change(): void
    {
        foreach (['admin', 'male_manager', 'female_manager'] as $role) {
            $user = app(DashboardAccountService::class)->create(
                'Login Test', 'direct-'.$role, $role, 'Secure-password-2026',
            );

            for ($attempt = 0; $attempt < 2; $attempt++) {
                $this->postJson('/api/auth/login', [
                    'login_code' => $user->login_code,
                    'password' => 'Secure-password-2026',
                ])->assertOk()->assertJsonPath('user.mustChangePassword', false);
            }

            $this->assertFalse((bool) $user->fresh()->must_change_password);
        }
    }

    public function test_existing_flags_are_cleared_without_changing_credentials_or_revoking_tokens(): void
    {
        $user = User::factory()->create([
            'role' => 'admin',
            'login_code' => 'existing-direct-login',
            'password' => Hash::make('Secure-password-2026'),
            'must_change_password' => true,
        ]);
        $passwordHash = $user->password;
        $token = $user->createToken('existing');
        $migration = require database_path('migrations/2026_10_03_000000_clear_automatic_password_change_flags.php');
        $migration->up();
        $migration->up();

        $this->assertFalse((bool) $user->fresh()->must_change_password);
        $this->assertSame($passwordHash, $user->fresh()->password);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $token->accessToken->id]);

        $this->postJson('/api/auth/login', [
            'login_code' => $user->login_code,
            'password' => 'Secure-password-2026',
        ])->assertOk()->assertJsonPath('user.mustChangePassword', false);

        $this->withToken($token->plainTextToken)->getJson('/api/dashboard/shell')->assertOk();
    }
}
