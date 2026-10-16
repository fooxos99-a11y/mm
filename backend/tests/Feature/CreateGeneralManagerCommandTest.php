<?php

namespace Tests\Feature;

use App\Console\Commands\CreateGeneralManager;
use App\Models\User;
use App\Support\DepartmentContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\Console\Tester\CommandTester;
use Tests\TestCase;

final class CreateGeneralManagerCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        DepartmentContext::reset();
        parent::setUp();
    }

    protected function tearDown(): void
    {
        DepartmentContext::reset();
        parent::tearDown();
    }

    private function command(string $loginCode, string $name, string $password, bool $stdin = true): CommandTester
    {
        $command = app(CreateGeneralManager::class);
        $command->setLaravel($this->app);
        $tester = new CommandTester($command);
        $tester->setInputs([$password]);
        $tester->execute([
            'loginCode' => $loginCode, 'name' => $name, '--password-stdin' => $stdin,
        ], ['interactive' => false]);

        return $tester;
    }

    public function test_private_stdin_creates_new_global_general_manager_with_hashed_password_and_no_secret_output(): void
    {
        $password = '13572468';
        $tester = $this->command('54831', 'مدير النظام الجديد', $password."\r\n");
        $this->assertSame(0, $tester->getStatusCode());
        $user = User::query()->where('login_code', '54831')->firstOrFail();
        $this->assertSame('super_admin', $user->role);
        $this->assertNull($user->department_id);
        $this->assertTrue($user->is_active);
        $this->assertTrue(Hash::check($password, $user->password));
        $this->assertNotSame($password, $user->password);
        $this->assertStringNotContainsString($password, $tester->getDisplay());
        $this->assertDatabaseHas('reserved_login_codes', [
            'login_code' => '54831', 'user_id' => $user->id, 'department_id' => null,
        ]);
    }

    public function test_existing_account_is_never_promoted_or_modified_and_secret_is_not_printed(): void
    {
        $existing = User::factory()->create(['login_code' => '54832', 'role' => 'male_manager']);
        $oldHash = $existing->password;
        $tester = $this->command('54832', 'محاولة حساب مكرر', '24681357');
        $this->assertSame(1, $tester->getStatusCode());
        $this->assertSame('male_manager', $existing->fresh()->role);
        $this->assertSame($oldHash, $existing->fresh()->password);
        $this->assertSame(1, User::query()->where('login_code', '54832')->count());
        $this->assertStringNotContainsString('24681357', $tester->getDisplay());
    }

    public function test_reserved_historical_account_number_cannot_be_claimed(): void
    {
        DB::table('reserved_login_codes')->insert([
            'login_code' => '54833', 'user_id' => null,
            'department_id' => DepartmentContext::DEFAULT_ID, 'created_at' => now(),
        ]);
        $tester = $this->command('54833', 'حساب برقم محجوز', '24681357');
        $this->assertSame(1, $tester->getStatusCode());
        $this->assertDatabaseMissing('users', ['login_code' => '54833']);
        $this->assertStringNotContainsString('24681357', $tester->getDisplay());
    }

    public function test_invalid_password_and_noninteractive_missing_stdin_fail_without_creating_accounts(): void
    {
        foreach (['secret42', '1234567', '123456789', "1234\n5678"] as $password) {
            $tester = $this->command('54834', 'حساب ببيانات مرفوضة', $password);
            $this->assertSame(1, $tester->getStatusCode());
            $this->assertStringNotContainsString($password, $tester->getDisplay());
        }
        $tester = $this->command('54834', 'حساب دون إدخال آمن', '13572468', false);
        $this->assertSame(1, $tester->getStatusCode());
        $this->assertDatabaseMissing('users', ['login_code' => '54834']);
    }

    public function test_public_registration_cannot_request_the_cli_general_manager_role(): void
    {
        $this->postJson('/api/auth/register-account', [
            'name' => 'حساب التسجيل العادي', 'loginCode' => '54835', 'password' => '13572468',
            'passwordConfirmation' => '13572468', 'role' => 'super_admin', 'is_active' => true,
        ])->assertCreated()->assertJsonPath('user.role', 'unassigned');
        $this->assertDatabaseHas('users', ['login_code' => '54835', 'role' => 'unassigned']);
        $this->assertDatabaseMissing('users', ['login_code' => '54835', 'role' => 'super_admin']);
    }
}
