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

    private function command(string $loginCode, string $name, string $password, bool $stdin = true, ?string $replace = null): CommandTester
    {
        $command = app(CreateGeneralManager::class);
        $command->setLaravel($this->app);
        $tester = new CommandTester($command);
        $tester->setInputs([$password]);
        $options = [
            'loginCode' => $loginCode, 'name' => $name, '--password-stdin' => $stdin,
        ];
        if ($replace !== null) {
            $options['--replace-login'] = $replace;
        }
        $tester->execute($options, ['interactive' => false]);

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

    public function test_single_letter_credentials_are_accepted_and_password_is_hashed(): void
    {
        $tester = $this->command('a', 'مدير النظام الجديد', '!');
        $this->assertSame(0, $tester->getStatusCode());
        $user = User::query()->where('login_code', 'a')->firstOrFail();
        $this->assertTrue(Hash::check('!', $user->password));
        $this->assertStringNotContainsString('!', $tester->getDisplay());
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
        foreach (['', ' ', str_repeat('a', 256)] as $password) {
            $tester = $this->command('54834', 'حساب ببيانات مرفوضة', $password);
            $this->assertSame(1, $tester->getStatusCode());
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
        ])->assertUnauthorized();
        $this->assertDatabaseMissing('users', ['login_code' => '54835']);
    }

    public function test_update_preserves_general_manager_identity_and_reserves_both_numbers_and_revokes_authentication(): void
    {
        $user = User::factory()->create(['role' => 'super_admin', 'department_id' => null, 'login_code' => '54836']);
        $name = $user->full_name;
        $user->createToken('old-browser');
        DB::table('sessions')->insert(['id' => 'old-manager-session', 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);
        $tester = $this->command('54837', 'اسم لا يستبدل الاسم القائم', '24681357', true, '54836');
        $this->assertSame(0, $tester->getStatusCode());
        $this->assertSame('54837', $user->fresh()->login_code);
        $this->assertSame($name, $user->fresh()->full_name);
        $this->assertTrue(Hash::check('24681357', $user->fresh()->password));
        $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
        $this->assertDatabaseCount('personal_access_tokens', 0);
        foreach (['54836', '54837'] as $number) {
            $this->assertDatabaseHas('reserved_login_codes', ['login_code' => $number, 'user_id' => $user->id]);
        }
        $this->assertDatabaseMissing('users', ['login_code' => '54836']);
        $this->assertStringNotContainsString('24681357', $tester->getDisplay());
    }

    public function test_update_cannot_take_another_accounts_number_or_historical_reservation(): void
    {
        $user = User::factory()->create(['role' => 'super_admin', 'department_id' => null, 'login_code' => '54838']);
        User::factory()->create(['login_code' => '54839']);
        DB::table('reserved_login_codes')->insert(['login_code' => '54840', 'user_id' => null, 'department_id' => DepartmentContext::DEFAULT_ID, 'created_at' => now()]);
        $before = $user->fresh()->getAttributes();
        foreach (['54839', '54840'] as $number) {
            $tester = $this->command($number, 'تحديث الحساب المرفوض', '24681357', true, '54838');
            $this->assertSame(1, $tester->getStatusCode());
            $this->assertSame($before, $user->fresh()->getAttributes());
            $this->assertStringNotContainsString('24681357', $tester->getDisplay());
        }
    }

    public function test_update_never_promotes_a_non_general_manager_or_creates_a_missing_source(): void
    {
        $user = User::factory()->create(['role' => 'admin', 'login_code' => '54841']);
        $before = $user->fresh()->getAttributes();
        foreach (['54841', '54842'] as $oldNumber) {
            $tester = $this->command('54843', 'محاولة تحديث مرفوضة', '24681357', true, $oldNumber);
            $this->assertSame(1, $tester->getStatusCode());
            $this->assertDatabaseMissing('users', ['login_code' => '54843']);
        }
        $this->assertSame($before, $user->fresh()->getAttributes());
    }

    public function test_password_can_be_rotated_without_changing_the_same_general_manager_number(): void
    {
        $user = User::factory()->create(['role' => 'super_admin', 'department_id' => null, 'login_code' => '54844']);
        $user->createToken('old-token');
        $tester = $this->command('54844', 'اسم الحساب العام', '24681357', true, '54844');
        $this->assertSame(0, $tester->getStatusCode());
        $this->assertTrue(Hash::check('24681357', $user->fresh()->password));
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->assertDatabaseCount('users', 1);
    }
}
