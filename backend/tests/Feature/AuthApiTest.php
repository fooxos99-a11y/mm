<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_log_in_and_receive_api_token(): void
    {
        User::query()->create([
            'full_name' => 'Admin User',
            'role' => 'admin',
            'login_code' => '1483',
            'password' => Hash::make('secret-pass'),
        ]);

        $this->postJson('/api/auth/login', [
            'login_code' => '1483',
            'password' => 'secret-pass',
        ])
            ->assertOk()
            ->assertJsonPath('user.loginCode', '1483')
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'role', 'loginCode']]);
    }

    public function test_user_route_returns_authenticated_user(): void
    {
        $user = User::factory()->create([
            'login_code' => '5001',
            'role' => 'admin',
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/auth/user')
            ->assertOk()
            ->assertJsonPath('loginCode', '5001')
            ->assertJsonMissingPath('password')
            ->assertJsonMissingPath('remember_token');
    }

    public function test_session_route_returns_null_for_a_guest_without_a_console_error_status(): void
    {
        $this->getJson('/api/auth/session')
            ->assertOk()
            ->assertJsonPath('user', null);
    }

    public function test_session_route_returns_the_authenticated_user(): void
    {
        $user = User::factory()->create([
            'login_code' => '5002',
            'role' => 'admin',
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/auth/session')
            ->assertOk()
            ->assertJsonPath('user.loginCode', '5002')
            ->assertJsonMissingPath('user.password')
            ->assertJsonMissingPath('user.remember_token');
    }

    public function test_stateful_spa_login_uses_the_server_session_without_exposing_a_token(): void
    {
        User::query()->create([
            'full_name' => 'Session Admin',
            'role' => 'admin',
            'login_code' => '1486',
            'password' => Hash::make('Secure-session-1486'),
        ]);

        $this->withHeader('Referer', 'http://127.0.0.1:8080')
            ->postJson('/api/auth/login', [
                'login_code' => '1486',
                'password' => 'Secure-session-1486',
            ])
            ->assertOk()
            ->assertJsonMissingPath('token')
            ->assertJsonPath('user.loginCode', '1486')
            ->assertJsonMissingPath('user.password')
            ->assertJsonMissingPath('user.remember_token');

        $this->assertAuthenticated();

        $this->withHeader('Referer', 'http://127.0.0.1:8080')
            ->getJson('/api/auth/user')
            ->assertOk()
            ->assertJsonPath('loginCode', '1486');
    }

    public function test_user_cannot_log_in_with_invalid_password(): void
    {
        User::query()->create([
            'full_name' => 'Admin User',
            'role' => 'admin',
            'login_code' => '1483',
            'password' => Hash::make('secret-pass'),
        ]);

        $this->postJson('/api/auth/login', [
            'login_code' => '1483',
            'password' => 'wrong-pass',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['login_code']);
    }

    public function test_legacy_account_must_change_password_before_accessing_protected_data(): void
    {
        $user = User::query()->create([
            'full_name' => 'Legacy User',
            'role' => 'admin',
            'login_code' => '1484',
            'password' => Hash::make('legacy-password'),
            'must_change_password' => true,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/auth/user')
            ->assertOk()
            ->assertJsonPath('mustChangePassword', true);
        $this->getJson('/api/dashboard/snapshot')->assertStatus(423);

        $this->putJson('/api/auth/password', [
            'currentPassword' => 'legacy-password',
            'password' => 'Updated-password-1484',
            'passwordConfirmation' => 'Updated-password-1484',
        ])
            ->assertOk()
            ->assertJsonPath('message', 'تم تغيير كلمة المرور. سجل الدخول بالبيانات الجديدة.');

        $this->assertFalse((bool) User::query()->find($user->id)?->must_change_password);
    }

    public function test_subdirectory_api_guest_receives_json_unauthenticated_response(): void
    {
        $this->withServerVariables([
            'REQUEST_URI' => '/momars/api/dashboard/snapshot',
        ])
            ->get('/api/dashboard/snapshot')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_public_snapshot_never_exposes_assessment_answer_keys(): void
    {
        $courseId = (string) Str::uuid();
        DB::table('courses')->insert([
            'id' => $courseId,
            'title' => 'اختبار محمي',
            'created_at' => now(),
        ]);
        DB::table('course_questions')->insert([
            'id' => (string) Str::uuid(),
            'course_id' => $courseId,
            'assessment_type' => 'pre',
            'question_type' => 'multiple',
            'prompt' => 'سؤال محمي',
            'options' => json_encode(['أ', 'ب']),
            'correct_answer' => 'ب',
            'created_at' => now(),
        ]);

        $this->getJson('/api/public/snapshot')
            ->assertOk()
            ->assertJsonPath('courses.0.preQuestions.0.correctAnswer', '');
    }

    public function test_training_material_attachment_requires_authentication(): void
    {
        $this->get('/api/training-material-attachments/not-a-real-uuid')
            ->assertUnauthorized();
    }
}
