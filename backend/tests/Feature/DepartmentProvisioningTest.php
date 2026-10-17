<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\User;
use App\Services\DepartmentManagementService;
use App\Support\DepartmentContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class DepartmentProvisioningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        DepartmentContext::reset();
        parent::setUp();
        Sanctum::actingAs(User::factory()->create(['role' => 'super_admin', 'department_id' => null]));
    }

    protected function tearDown(): void
    {
        DepartmentContext::reset();
        parent::tearDown();
    }

    private function payload(string $login = '76123456'): array
    {
        return [
            'name' => 'إدارة التأهيل الجديدة', 'managerTitle' => 'مدير التأهيل',
            'managerLoginCode' => $login, 'managerPassword' => '12345678', 'isActive' => true,
        ];
    }

    public function test_one_request_creates_department_and_hashed_manager_account_and_enables_its_own_dashboard(): void
    {
        $response = $this->postJson('/api/management/departments', [
            ...$this->payload(), 'role' => 'super_admin', 'department_id' => DepartmentContext::DEFAULT_ID,
        ])->assertCreated()->assertJsonPath('department.manager.loginCode', '76123456');
        $departmentId = $response->json('department.id');
        $manager = User::query()->where('login_code', '76123456')->firstOrFail();
        $this->assertSame($departmentId, $manager->department_id);
        $this->assertSame('admin', $manager->role);
        $this->assertTrue(Hash::check('12345678', $manager->password));
        $this->assertStringNotContainsString('12345678', $response->getContent());
        $this->assertDatabaseHas('departments', ['id' => $departmentId, 'manager_user_id' => $manager->id]);
        $this->assertDatabaseHas('reserved_login_codes', ['login_code' => '76123456', 'department_id' => $departmentId]);
        Sanctum::actingAs($manager);
        $this->getJson('/api/dashboard/shell')->assertOk();
        $this->getJson('/api/dashboard/registration')->assertOk()->assertJsonCount(0, 'requests');
        $this->getJson('/api/management/departments')->assertForbidden();
    }

    public function test_used_and_reserved_numbers_never_overwrite_accounts_or_leave_a_department(): void
    {
        $existing = User::factory()->create(['login_code' => '76123456']);
        $original = $existing->fresh()->getAttributes();
        DB::table('reserved_login_codes')->insert([
            'login_code' => '76123457', 'user_id' => null, 'department_id' => null, 'created_at' => now(),
        ]);
        foreach (['76123456', '76123457'] as $login) {
            $this->postJson('/api/management/departments', $this->payload($login))
                ->assertUnprocessable()->assertJsonValidationErrors('managerLoginCode');
        }
        $this->assertSame($original, $existing->fresh()->getAttributes());
        $this->assertDatabaseCount('departments', 1);
        $this->assertDatabaseMissing('users', ['login_code' => '76123457']);
    }

    public function test_missing_or_invalid_new_manager_password_cannot_create_partial_accounts(): void
    {
        foreach ([null, '', ' ', str_repeat('a', 256)] as $password) {
            $this->postJson('/api/management/departments', [...$this->payload(), 'managerPassword' => $password])
                ->assertUnprocessable()->assertJsonValidationErrors('managerPassword');
        }
        $this->assertDatabaseCount('departments', 1);
        $this->assertDatabaseMissing('users', ['login_code' => '76123456']);
        $this->assertDatabaseMissing('reserved_login_codes', ['login_code' => '76123456']);
    }

    public function test_short_credentials_create_usable_accounts_and_remain_globally_unique(): void
    {
        foreach (['0', '1', '12', 'a', 'ab', 'ع', 'سع', '!', 'name @'] as $credential) {
            $password = $credential === '!' ? ' a! ' : $credential;
            $payload = [...$this->payload($credential), 'managerPassword' => $password];
            $created = $this->postJson('/api/management/departments', $payload)->assertCreated();
            $manager = User::query()->where('login_code', $credential)->firstOrFail();
            $this->assertTrue(Hash::check($password, $manager->password));
            $this->assertSame($created->json('department.id'), $manager->department_id);
            $this->postJson('/api/auth/login', ['login_code' => $credential, 'password' => $password])
                ->assertOk()->assertJsonPath('user.role', 'admin')
                ->assertJsonPath('user.departmentId', $manager->department_id);
            $this->postJson('/api/management/departments', $payload)
                ->assertUnprocessable()->assertJsonValidationErrors('managerLoginCode');
        }
        $this->assertDatabaseCount('departments', 10);
    }

    public function test_failure_after_account_creation_rolls_back_account_reservation_and_department(): void
    {
        Department::created(static function (): void {
            throw new \RuntimeException('Simulated provisioning failure');
        });
        try {
            app(DepartmentManagementService::class)->save($this->payload());
            $this->fail('Provisioning should have failed.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Simulated provisioning failure', $exception->getMessage());
        }
        $this->assertDatabaseCount('departments', 1);
        $this->assertDatabaseMissing('users', ['login_code' => '76123456']);
        $this->assertDatabaseMissing('reserved_login_codes', ['login_code' => '76123456']);
    }
}
