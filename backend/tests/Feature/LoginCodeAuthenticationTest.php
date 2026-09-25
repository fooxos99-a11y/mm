<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LoginCodeAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_authenticate_with_login_code_and_password(): void
    {
        $user = User::query()->create([
            'full_name' => 'Admin User',
            'role' => 'admin',
            'login_code' => '1483',
            'password' => Hash::make('secret-pass'),
        ]);

        $response = $this->postJson('/login', [
            'login_code' => '1483',
            'password' => 'secret-pass',
        ]);

        $response->assertOk();
        $this->assertAuthenticatedAs($user);
    }

    public function test_user_cannot_authenticate_with_invalid_password(): void
    {
        User::query()->create([
            'full_name' => 'Admin User',
            'role' => 'admin',
            'login_code' => '1483',
            'password' => Hash::make('secret-pass'),
        ]);

        $response = $this->from('/login')->postJson('/login', [
            'login_code' => '1483',
            'password' => 'wrong-pass',
        ]);

        $response->assertStatus(422);
        $this->assertGuest();
    }

    public function test_web_session_authenticates_stateful_api_requests(): void
    {
        User::query()->create([
            'full_name' => 'Session User',
            'role' => 'admin',
            'login_code' => '1485',
            'password' => Hash::make('session-pass'),
        ]);

        $this->withHeader('Referer', 'http://localhost')
            ->postJson('/login', [
                'login_code' => '1485',
                'password' => 'session-pass',
            ])
            ->assertOk();

        $this->withHeader('Referer', 'http://localhost')
            ->getJson('/api/auth/user')
            ->assertOk()
            ->assertJsonPath('loginCode', '1485');
    }

    public function test_student_created_via_students_api_can_authenticate_with_login_code(): void
    {
        Sanctum::actingAs(User::query()->create([
            'full_name' => 'Admin User',
            'role' => 'admin',
            'login_code' => '9000',
            'password' => Hash::make('9000'),
        ]));

        $this->postJson('/api/students', [
            'name' => 'طالب دخول',
            'loginId' => '1234',
            'password' => 'Secure-password-1234',
            'passwordConfirmation' => 'Secure-password-1234',
            'branchId' => 'male',
            'note' => '',
        ])->assertCreated();

        $response = $this->postJson('/api/auth/login', [
            'login_code' => '1234',
            'password' => 'Secure-password-1234',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('user.role', 'student')
            ->assertJsonPath('user.loginCode', '1234');
    }

    public function test_student_can_be_created_without_password_then_receive_a_secure_password(): void
    {
        Sanctum::actingAs(User::query()->create([
            'full_name' => 'Admin User',
            'role' => 'admin',
            'login_code' => '9000',
            'password' => Hash::make('9000'),
        ]));

        $studentId = $this->postJson('/api/students', [
            'name' => 'س',
            'loginId' => 'A123',
            'branchId' => 'male',
            'note' => '',
        ])->assertCreated()->json('id');

        $user = User::query()->where('login_code', 'A123')->firstOrFail();
        $this->assertFalse(Hash::check('', $user->password));

        $this->putJson('/api/students/'.$studentId, [
            'password' => '7',
            'passwordConfirmation' => '7',
        ])->assertUnprocessable();

        $this->putJson('/api/students/'.$studentId, [
            'password' => 'Student-password-2026',
            'passwordConfirmation' => 'Student-password-2026',
        ])->assertOk();

        $this->assertTrue(Hash::check('Student-password-2026', $user->fresh()->password));
    }
}
