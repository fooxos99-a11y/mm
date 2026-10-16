<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_browser_session_can_change_password_and_is_logged_out(): void
    {
        $user = User::factory()->create([
            'role' => 'admin',
            'password' => Hash::make('Current-password-2026'),
        ]);

        $this->actingAs($user, 'web')
            ->withHeader('Referer', 'http://127.0.0.1:8080')
            ->putJson('/api/auth/password', [
                'currentPassword' => 'Current-password-2026',
                'password' => '01234567',
                'passwordConfirmation' => '01234567',
            ])
            ->assertOk();

        $this->assertGuest('web');
        $this->assertTrue(Hash::check('01234567', (string) $user->fresh()->password));
    }

    public function test_password_change_revokes_every_token_and_session(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('Current-password-2026'),
            'must_change_password' => true,
        ]);
        $currentToken = $user->createToken('current');
        $obsoleteToken = $user->createToken('obsolete');
        DB::table('sessions')->insert([
            [
                'id' => 'old-session-one',
                'user_id' => $user->id,
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Test',
                'payload' => '',
                'last_activity' => now()->timestamp,
            ],
            [
                'id' => 'old-session-two',
                'user_id' => $user->id,
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Test',
                'payload' => '',
                'last_activity' => now()->timestamp,
            ],
        ]);

        $this->withToken($currentToken->plainTextToken)
            ->putJson('/api/auth/password', [
                'currentPassword' => 'Current-password-2026',
                'password' => '01234567',
                'passwordConfirmation' => '01234567',
            ])
            ->assertOk()
            ->assertJsonPath('message', 'تم تغيير كلمة المرور. سجل الدخول بالبيانات الجديدة.');

        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $currentToken->accessToken->getKey(),
        ]);
        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $obsoleteToken->accessToken->getKey(),
        ]);
        $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
        $this->assertTrue(Hash::check('01234567', (string) $user->fresh()->password));
    }

    public function test_password_change_rejects_letters_even_with_eight_characters(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('Current-password-2026'),
        ]);

        $this->withToken($user->createToken('current')->plainTextToken)
            ->putJson('/api/auth/password', [
                'currentPassword' => 'Current-password-2026',
                'password' => 'short123',
                'passwordConfirmation' => 'short123',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);
    }

    public function test_student_cannot_change_their_own_password(): void
    {
        $user = User::factory()->create([
            'role' => 'student',
            'password' => Hash::make('123'),
        ]);

        $this->withToken($user->createToken('student')->plainTextToken)
            ->putJson('/api/auth/password', [
                'currentPassword' => '123',
                'password' => '01234567',
                'passwordConfirmation' => '01234567',
            ])
            ->assertForbidden()
            ->assertJsonPath('message', 'بيانات دخول الطالب يحددها المسؤول فقط.');

        $this->assertTrue(Hash::check('123', (string) $user->fresh()->password));
    }

    public function test_password_change_rejects_reusing_the_current_password(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('87654321'),
            'must_change_password' => true,
        ]);

        $this->withToken($user->createToken('current')->plainTextToken)
            ->putJson('/api/auth/password', [
                'currentPassword' => '87654321',
                'password' => '87654321',
                'passwordConfirmation' => '87654321',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);

        $this->assertTrue((bool) $user->fresh()->must_change_password);
    }

    public function test_password_change_is_rate_limited_per_user_and_ip(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('Current-password-2026'),
        ]);
        $token = $user->createToken('current')->plainTextToken;
        $payload = [
            'currentPassword' => 'Wrong-current-password',
            'password' => '01234567',
            'passwordConfirmation' => '01234567',
        ];

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->withToken($token)
                ->putJson('/api/auth/password', $payload)
                ->assertUnprocessable();
        }

        $this->withToken($token)
            ->putJson('/api/auth/password', $payload)
            ->assertTooManyRequests();
    }
}
