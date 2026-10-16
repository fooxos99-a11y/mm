<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\User;
use App\Support\DepartmentContext;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\EndToEndAccountSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Tests\TestCase;

final class DatabaseSeederIsolationTest extends TestCase
{
    use RefreshDatabase;

    private array $seedEnvironment = [];

    protected function setUp(): void
    {
        DepartmentContext::reset();
        parent::setUp();
        $this->environment('MOMARS_SEED_ADMIN_LOGIN', '675321');
        $this->environment('MOMARS_SEED_ADMIN_PASSWORD', '34981726');
        $this->environment('MOMARS_SEED_ADMIN_NAME', 'Seed administrator');
        $this->environment('MOMARS_SEED_ADMIN_EMAIL', 'seed-isolation@example.test');
        $this->environment('MOMARS_SEED_E2E_ROLES', 'false');
    }

    protected function tearDown(): void
    {
        foreach ($this->seedEnvironment as $key => [$process, $environment, $server]) {
            $process === false ? putenv($key) : putenv($key.'='.$process);
            if ($environment === null) {
                unset($_ENV[$key]);
            } else {
                $_ENV[$key] = $environment;
            }
            if ($server === null) {
                unset($_SERVER[$key]);
            } else {
                $_SERVER[$key] = $server;
            }
        }
        DepartmentContext::reset();
        parent::tearDown();
    }

    private function environment(string $key, string $value): void
    {
        if (! array_key_exists($key, $this->seedEnvironment)) {
            $this->seedEnvironment[$key] = [getenv($key), $_ENV[$key] ?? null, $_SERVER[$key] ?? null];
        }
        putenv($key.'='.$value);
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }

    private function seedAdministrator(): void
    {
        Artisan::call('db:seed', ['--class' => DatabaseSeeder::class, '--force' => true]);
    }

    private function assertSeedRejected(): void
    {
        try {
            $this->seedAdministrator();
        } catch (RuntimeException|ValidationException) {
            return;
        }
        $this->fail('A conflicting bootstrap account must be rejected.');
    }

    public function test_bootstrap_uses_the_legacy_department_and_registers_its_number_once(): void
    {
        $other = Department::query()->create(['name' => 'Another department', 'manager_title' => 'Manager']);
        DepartmentContext::set($other->id);
        $this->seedAdministrator();
        $user = User::query()->where('login_code', '675321')->firstOrFail();
        $hash = $user->password;
        $this->assertSame(DepartmentContext::DEFAULT_ID, $user->department_id);
        $this->assertSame('admin', $user->role);
        $this->assertTrue(Hash::check('34981726', $hash));
        $this->assertSame($other->id, DepartmentContext::id());
        $this->assertDatabaseHas('reserved_login_codes', [
            'login_code' => '675321', 'user_id' => $user->id, 'department_id' => DepartmentContext::DEFAULT_ID,
        ]);

        $this->sessionFor($user);
        $token = $user->createToken('seed-idempotency')->accessToken;
        $this->seedAdministrator();
        $this->assertSame($user->id, User::query()->where('login_code', '675321')->sole()->id);
        $this->assertSame($hash, $user->fresh()->password);
        $this->assertDatabaseHas('sessions', ['id' => 'seed-session-'.$user->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $token->id]);
        $this->assertSame(1, DB::table('reserved_login_codes')->where('login_code', '675321')->count());
    }

    public function test_reserved_numbers_cannot_be_claimed_in_either_department(): void
    {
        $other = Department::query()->create(['name' => 'Reserved department', 'manager_title' => 'Manager']);
        foreach ([DepartmentContext::DEFAULT_ID, $other->id] as $index => $origin) {
            $login = (string) (675321 + $index);
            $this->environment('MOMARS_SEED_ADMIN_LOGIN', $login);
            DB::table('reserved_login_codes')->insert([
                'login_code' => $login, 'user_id' => null, 'department_id' => $origin, 'created_at' => now(),
            ]);
            $this->assertSeedRejected();
            $this->assertDatabaseMissing('users', ['login_code' => $login]);
            $this->assertDatabaseHas('reserved_login_codes', ['login_code' => $login, 'user_id' => null, 'department_id' => $origin]);
        }
    }

    public function test_existing_foreign_or_non_admin_accounts_are_never_reset_or_demoted(): void
    {
        $other = Department::query()->create(['name' => 'Protected department', 'manager_title' => 'Manager']);
        foreach ([['super_admin', null], ['admin', $other->id], ['student', DepartmentContext::DEFAULT_ID], ['unassigned', null]] as $index => [$role, $department]) {
            $login = (string) (675321 + $index);
            $user = User::factory()->create(['login_code' => $login, 'role' => $role, 'department_id' => $department]);
            $before = $user->fresh()->getAttributes();
            $this->sessionFor($user);
            $this->environment('MOMARS_SEED_ADMIN_LOGIN', $login);
            $this->assertSeedRejected();
            $this->assertSame($before, $user->fresh()->getAttributes());
            $this->assertDatabaseHas('sessions', ['id' => 'seed-session-'.$user->id]);
            $this->assertDatabaseHas('reserved_login_codes', ['login_code' => $login, 'user_id' => $user->id]);
        }
    }

    public function test_an_actual_seed_password_change_revokes_existing_authentication(): void
    {
        $this->seedAdministrator();
        $user = User::query()->where('login_code', '675321')->firstOrFail();
        $this->sessionFor($user);
        $token = $user->createToken('seed-password-change')->accessToken;
        $this->environment('MOMARS_SEED_ADMIN_PASSWORD', '81726349');
        $this->seedAdministrator();
        $this->assertTrue(Hash::check('81726349', $user->fresh()->password));
        $this->assertDatabaseMissing('sessions', ['id' => 'seed-session-'.$user->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $token->id]);
    }

    public function test_failed_fixture_seeding_rolls_back_the_bootstrap_account_and_reservation(): void
    {
        $this->environment('MOMARS_SEED_E2E_ROLES', 'true');
        $this->environment('MOMARS_SEED_E2E_ROLE_PASSWORD', '');
        $this->assertSeedRejected();
        $this->assertDatabaseMissing('users', ['login_code' => '675321']);
        $this->assertDatabaseMissing('reserved_login_codes', ['login_code' => '675321']);
    }

    public function test_test_only_role_fixtures_remain_repeatable_with_model_events_enabled(): void
    {
        $this->environment('MOMARS_SEED_E2E_ROLES', 'true');
        $this->environment('MOMARS_SEED_E2E_ROLE_PASSWORD', '81726349');
        $this->seedAdministrator();
        $this->seedAdministrator();
        $this->assertDatabaseHas('users', ['login_code' => 'e2e-general-manager', 'role' => 'super_admin', 'department_id' => null]);
        $this->assertDatabaseHas('users', ['login_code' => 'e2ependingmanager', 'role' => 'unassigned', 'department_id' => null]);
        $this->assertDatabaseHas('users', ['login_code' => 'e2e-reciter-role', 'role' => 'reciter', 'department_id' => DepartmentContext::DEFAULT_ID]);
        foreach (['e2e-general-manager', 'e2ependingmanager'] as $login) {
            $this->assertDatabaseHas('reserved_login_codes', ['login_code' => $login, 'department_id' => null]);
        }
        foreach (User::query()->get() as $user) {
            $this->assertDatabaseHas('reserved_login_codes', ['login_code' => $user->login_code, 'user_id' => $user->id]);
        }
        $this->assertDatabaseCount('users', 8);
    }

    public function test_direct_test_role_seeder_rejects_production_before_writing_accounts(): void
    {
        $this->environment('MOMARS_SEED_E2E_ROLE_PASSWORD', '81726349');
        $previous = $this->app['env'];
        $this->app['env'] = 'production';
        try {
            try {
                Artisan::call('db:seed', ['--class' => EndToEndAccountSeeder::class, '--force' => true]);
                $this->fail('The test role seeder must refuse production.');
            } catch (RuntimeException $exception) {
                $this->assertStringContainsString('testing environment', $exception->getMessage());
            }
        } finally {
            $this->app['env'] = $previous;
        }
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('reserved_login_codes', 0);
    }

    private function sessionFor(User $user): void
    {
        DB::table('sessions')->insert([
            'id' => 'seed-session-'.$user->id, 'user_id' => $user->id, 'payload' => '', 'last_activity' => now()->timestamp,
        ]);
    }
}
