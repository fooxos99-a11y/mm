<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LearnerCredentialPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_students_and_trainees_cannot_change_password_even_with_a_legacy_flag(): void
    {
        foreach (['student', 'trainee'] as $role) {
            foreach ([false, true] as $flag) {
                $user = User::factory()->create(['role' => $role, 'must_change_password' => $flag,
                    'password' => Hash::make('01234567')]);
                $originalHash = $user->password;
                Sanctum::actingAs($user);
                $this->getJson('/api/auth/user')->assertOk()->assertJsonPath('mustChangePassword', false);
                $this->getJson('/api/dashboard/snapshot')->assertOk();
                $this->putJson('/api/auth/password', ['currentPassword' => '01234567',
                    'password' => '87654321', 'passwordConfirmation' => '87654321'])->assertForbidden();
                $this->putJson('/api/auth/password', [])->assertForbidden();
                $this->putJson('/user/password', ['current_password' => '01234567',
                    'password' => '87654321', 'password_confirmation' => '87654321'])->assertNotFound();
                $this->assertSame($originalHash, $user->fresh()->password);
            }
        }
    }

    public function test_login_logout_and_relogin_preserve_learner_credentials_and_clear_legacy_flags(): void
    {
        foreach (['student', 'trainee'] as $role) {
            $code = $role === 'student' ? '00708' : '00709';
            $user = User::factory()->create(['role' => $role, 'login_code' => $code,
                'must_change_password' => true, 'password' => Hash::make('01234567')]);
            $originalHash = $user->password;
            for ($cycle = 0; $cycle < 2; $cycle++) {
                Auth::forgetGuards();
                $this->withHeader('Referer', 'http://127.0.0.1:8080')->postJson('/api/auth/login', [
                    'login_code' => $code, 'password' => '01234567',
                ])->assertOk()->assertJsonPath('user.mustChangePassword', false);
                $this->postJson('/api/auth/logout')->assertNoContent();
                Auth::forgetGuards();
                $this->getJson('/api/auth/user')->assertUnauthorized();
                $this->assertSame($originalHash, $user->fresh()->password);
                $this->assertSame($code, $user->fresh()->login_code);
                $this->assertFalse($user->fresh()->must_change_password);
            }
            $this->postJson('/api/auth/login', ['login_code' => $code, 'password' => 'wrong'])->assertUnprocessable();
        }
    }

    public function test_migration_only_clears_learner_flags_without_changing_passwords(): void
    {
        $student = User::factory()->create(['role' => 'student', 'must_change_password' => true]);
        $trainee = User::factory()->create(['role' => 'trainee', 'must_change_password' => true]);
        $reciter = User::factory()->create(['role' => 'reciter', 'must_change_password' => true]);
        $hashes = [$student->password, $trainee->password, $reciter->password];
        $migration = require database_path('migrations/2026_10_26_000000_disable_student_password_changes.php');
        $migration->up();
        $this->assertFalse($student->fresh()->must_change_password);
        $this->assertFalse($trainee->fresh()->must_change_password);
        $this->assertTrue($reciter->fresh()->must_change_password);
        $this->assertSame($hashes, [$student->fresh()->password, $trainee->fresh()->password, $reciter->fresh()->password]);
    }
}
