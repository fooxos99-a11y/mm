<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\DepartmentManagementService;
use App\Support\DepartmentContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class DepartmentManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        DepartmentContext::reset();
        parent::tearDown();
    }

    public function test_general_manager_creates_an_account_that_waits_for_assignment_and_cannot_choose_its_own_role(): void
    {
        $general = User::factory()->create(['role' => 'super_admin', 'department_id' => null]);
        Sanctum::actingAs($general);
        $response = $this->postJson('/api/auth/register-account', [
            'name' => 'مسؤول إدارة جديد', 'loginCode' => '1483', 'password' => '12345678',
            'passwordConfirmation' => '12345678', 'role' => 'super_admin',
            'department_id' => DepartmentContext::DEFAULT_ID,
        ])->assertCreated()->assertJsonPath('user.role', 'unassigned')->assertJsonPath('user.departmentId', null);
        $user = User::query()->findOrFail($response->json('user.id'));
        Sanctum::actingAs($user);
        $this->getJson('/api/dashboard/shell')->assertForbidden();
        $this->getJson('/api/management/departments')->assertForbidden();
        $this->withHeader('X-Department-Id', DepartmentContext::DEFAULT_ID)->getJson('/api/dashboard/snapshot')
            ->assertForbidden();
    }

    public function test_guests_cannot_create_responsible_accounts(): void
    {
        $this->postJson('/api/auth/register-account', [
            'name' => 'مسؤول غير مصرح له', 'loginCode' => '1483', 'password' => '12345678',
            'passwordConfirmation' => '12345678',
        ])->assertUnauthorized();
        $this->assertDatabaseMissing('users', ['login_code' => '1483']);
        $this->assertDatabaseMissing('reserved_login_codes', ['login_code' => '1483']);
    }

    public function test_only_the_general_manager_can_create_responsible_accounts(): void
    {
        foreach (['admin', 'male_manager', 'female_manager', 'trainee', 'reciter', 'student', 'unassigned'] as $role) {
            $user = User::factory()->create([
                'role' => $role, 'department_id' => $role === 'unassigned' ? null : DepartmentContext::DEFAULT_ID,
            ]);
            Sanctum::actingAs($user);
            $this->postJson('/api/auth/register-account', [
                'name' => 'مسؤول غير مصرح له', 'loginCode' => '1483', 'password' => '12345678',
                'passwordConfirmation' => '12345678', 'role' => 'super_admin',
            ])->assertForbidden();
            $this->assertDatabaseMissing('users', ['login_code' => '1483']);
            $this->assertDatabaseMissing('reserved_login_codes', ['login_code' => '1483']);
        }
    }

    public function test_general_manager_cannot_reuse_existing_or_reserved_responsible_numbers(): void
    {
        $general = User::factory()->create(['role' => 'super_admin', 'department_id' => null]);
        User::factory()->create(['login_code' => '1483']);
        DB::table('reserved_login_codes')->insert([
            'login_code' => '1484', 'user_id' => null, 'department_id' => null, 'created_at' => now(),
        ]);
        Sanctum::actingAs($general);
        foreach (['1483', '1484'] as $loginCode) {
            $this->postJson('/api/auth/register-account', [
                'name' => 'مسؤول برقم مكرر', 'loginCode' => $loginCode, 'password' => '12345678',
                'passwordConfirmation' => '12345678',
            ])->assertUnprocessable()->assertJsonValidationErrors('loginCode');
        }
        $this->assertDatabaseMissing('users', ['login_code' => '1484']);
    }

    public function test_general_manager_assigns_existing_account_and_preserves_custom_title(): void
    {
        $general = User::factory()->create(['role' => 'super_admin', 'department_id' => null]);
        $manager = User::factory()->create(['role' => 'unassigned', 'department_id' => null, 'login_code' => '1483']);
        Sanctum::actingAs($general);
        $response = $this->postJson('/api/management/departments', [
            'name' => 'إدارة التدريب', 'managerLoginCode' => '1483', 'managerTitle' => 'مدير التدريب', 'isActive' => true,
        ])->assertCreated()->assertJsonPath('department.manager.loginCode', '1483');
        $id = $response->json('department.id');
        $this->assertDatabaseHas('users', ['id' => $manager->id, 'department_id' => $id, 'role' => 'admin']);
        $this->assertDatabaseHas('completion_requirement_settings', ['department_id' => $id, 'branch_code' => 'male']);
        $this->assertDatabaseHas('registration_settings', ['department_id' => $id, 'value' => '0']);
        $this->getJson('/api/dashboard/shell')->assertForbidden();
        $this->putJson('/api/management/context', ['departmentId' => $id])->assertOk()
            ->assertJsonPath('user.role', 'admin')->assertJsonPath('user.systemRole', 'super_admin')
            ->assertJsonPath('user.roleLabel', 'مدير التدريب');
        $this->withHeader('X-Department-Id', $id)->getJson('/api/dashboard/shell')->assertOk();
        $this->withHeader('X-Department-Id', $id)->getJson('/api/management/overview')->assertOk();
        $this->assertDatabaseHas('users', ['id' => $general->id, 'role' => 'super_admin', 'department_id' => null]);
        Sanctum::actingAs($manager->fresh());
        $this->withHeader('X-Department-Id', $id)->getJson('/api/auth/user')->assertOk()
            ->assertJsonPath('roleLabel', 'مدير التدريب');
        $this->withHeader('X-Department-Id', $id)->getJson('/api/management/departments')->assertForbidden();
    }

    public function test_accounts_and_operations_are_isolated_and_login_numbers_are_global(): void
    {
        [$manager, $id] = $this->department();
        Sanctum::actingAs($manager);
        $student = $this->postJson('/api/students', [
            'name' => 'معلم الإدارة الثانية', 'loginId' => '0924', 'password' => '12345678',
            'passwordConfirmation' => '12345678', 'branchId' => 'male',
        ])->assertCreated();
        $this->assertDatabaseHas('users', ['login_code' => '0924', 'department_id' => $id]);
        $studentId = DB::table('students')->where('login_code', '0924')->value('id');
        $course = $this->postJson('/api/dashboard/courses', ['title' => 'دورة الإدارة الثانية', 'isActive' => true])
            ->assertCreated();
        $courseId = DB::table('courses')->where('department_id', $id)->value('id');
        $other = User::factory()->create(['role' => 'admin', 'department_id' => DepartmentContext::DEFAULT_ID]);
        Sanctum::actingAs($other);
        $this->getJson('/api/dashboard/snapshot')->assertOk()->assertJsonMissing(['name' => 'معلم الإدارة الثانية'])
            ->assertJsonMissing(['title' => 'دورة الإدارة الثانية']);
        $this->putJson('/api/students/'.$studentId, ['name' => 'محاولة تعديل'])->assertNotFound();
        $this->deleteJson('/api/dashboard/courses/'.$courseId)->assertNotFound();
        $this->assertDatabaseHas('courses', ['id' => $courseId, 'department_id' => $id]);
        $this->postJson('/api/students', [
            'name' => 'رقم مكرر', 'loginId' => '0924', 'branchId' => 'male',
        ])->assertUnprocessable();
        $this->withHeader('X-Department-Id', $id)->getJson('/api/dashboard/snapshot')->assertForbidden();
    }

    public function test_archiving_one_department_preserves_other_data_and_reserves_the_login(): void
    {
        [$manager, $id] = $this->department();
        Sanctum::actingAs($manager);
        $this->postJson('/api/students', ['name' => 'معلم للأرشيف', 'loginId' => '0924', 'branchId' => 'male'])
            ->assertCreated();
        $this->postJson('/api/dashboard/courses', ['title' => 'دورة خاصة', 'isActive' => true])->assertCreated();
        DB::table('completion_requirement_settings')->where('department_id', DepartmentContext::DEFAULT_ID)
            ->update(['is_closed' => true]);
        $this->postJson('/api/dashboard/archives/archive-all', ['name' => 'دفعة مستقلة', 'batch_type' => 'all'])
            ->assertOk();
        $this->assertDatabaseHas('completion_requirement_settings', [
            'department_id' => DepartmentContext::DEFAULT_ID, 'is_closed' => true,
        ]);
        $this->postJson('/api/students', ['name' => 'إعادة استخدام رقم', 'loginId' => '0924', 'branchId' => 'male'])
            ->assertUnprocessable();
        $general = User::factory()->create(['role' => 'super_admin', 'department_id' => null]);
        Sanctum::actingAs($general);
        $this->getJson('/api/management/archives')->assertOk()->assertJsonCount(1, 'archives');
        $this->getJson('/api/management/archives/search/students?name='.urlencode('معلم للأرشيف'))
            ->assertOk()->assertJsonCount(1);
    }

    public function test_inactive_departments_and_account_reassignment_fail_closed(): void
    {
        [$manager, $id] = $this->department();
        DB::table('departments')->where('id', $id)->update(['is_active' => false]);
        Sanctum::actingAs($manager);
        $this->getJson('/api/dashboard/snapshot')->assertNotFound();
        $general = User::factory()->create(['role' => 'super_admin', 'department_id' => null]);
        Sanctum::actingAs($general);
        $this->postJson('/api/management/departments', [
            'name' => 'إدارة أخرى', 'managerLoginCode' => $manager->login_code, 'managerTitle' => 'مسؤول',
        ])->assertUnprocessable();
    }

    private function department(): array
    {
        $manager = User::factory()->create(['role' => 'unassigned', 'department_id' => null]);
        $department = app(DepartmentManagementService::class)->save([
            'name' => 'الإدارة الثانية', 'managerTitle' => 'مدير التدريب', 'managerLoginCode' => $manager->login_code,
        ]);

        return [$manager->fresh(), $department['id']];
    }
}
