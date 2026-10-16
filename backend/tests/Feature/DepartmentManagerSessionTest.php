<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\User;
use App\Services\DepartmentManagementService;
use App\Support\DepartmentContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final class DepartmentManagerSessionTest extends TestCase
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

    public function test_name_and_title_changes_preserve_same_manager_session_and_token(): void
    {
        [$manager, $department] = $this->department();
        [$session, $token] = $this->authenticate($manager);

        app(DepartmentManagementService::class)->save([
            'name' => 'اسم الإدارة الجديد', 'managerTitle' => 'مدير التأهيل',
            'managerLoginCode' => $manager->login_code, 'isActive' => true,
        ], $department['id']);

        $this->assertDatabaseHas('departments', ['id' => $department['id'], 'name' => 'اسم الإدارة الجديد', 'manager_title' => 'مدير التأهيل']);
        $this->assertDatabaseHas('sessions', ['id' => $session, 'user_id' => $manager->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $token, 'tokenable_id' => $manager->id]);
    }

    public function test_replacement_revokes_both_previous_manager_and_new_manager_authentication(): void
    {
        [$manager, $department] = $this->department();
        [$oldSession, $oldToken] = $this->authenticate($manager);
        $replacement = User::factory()->create(['role' => 'unassigned', 'department_id' => null]);
        [$newSession, $newToken] = $this->authenticate($replacement);

        app(DepartmentManagementService::class)->save([
            'name' => $department['name'], 'managerTitle' => 'مدير التدريب',
            'managerLoginCode' => $replacement->login_code, 'isActive' => true,
        ], $department['id']);

        $this->assertDatabaseMissing('sessions', ['id' => $oldSession]);
        $this->assertDatabaseMissing('sessions', ['id' => $newSession]);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $oldToken]);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $newToken]);
        $this->assertDatabaseHas('users', ['id' => $manager->id, 'role' => 'unassigned', 'department_id' => null]);
        $this->assertDatabaseHas('users', ['id' => $replacement->id, 'role' => 'admin', 'department_id' => $department['id']]);
    }

    public function test_suspending_department_still_revokes_same_manager_authentication(): void
    {
        [$manager, $department] = $this->department();
        [$session, $token] = $this->authenticate($manager);
        app(DepartmentManagementService::class)->save([
            'name' => $department['name'], 'managerTitle' => 'مدير التدريب',
            'managerLoginCode' => $manager->login_code, 'isActive' => false,
        ], $department['id']);

        $this->assertDatabaseMissing('sessions', ['id' => $session]);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $token]);
        $this->assertDatabaseHas('departments', ['id' => $department['id'], 'is_active' => false]);
    }

    #[DataProvider('accessChanges')]
    public function test_account_access_changes_still_revoke_authentication(string $attribute, mixed $value): void
    {
        $manager = User::factory()->create(['role' => 'admin']);
        [$session, $token] = $this->authenticate($manager);
        if ($attribute === 'department_id') {
            $value = Department::create(['name' => 'إدارة أخرى'])->id;
        }
        $manager->forceFill([$attribute => $value])->save();

        $this->assertDatabaseMissing('sessions', ['id' => $session]);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $token]);
    }

    public static function accessChanges(): array
    {
        return ['role' => ['role', 'male_manager'], 'department' => ['department_id', null], 'account status' => ['is_active', false]];
    }

    private function department(): array
    {
        $manager = User::factory()->create(['role' => 'unassigned', 'department_id' => null]);
        $department = app(DepartmentManagementService::class)->save([
            'name' => 'إدارة التدريب', 'managerTitle' => 'مدير التدريب', 'managerLoginCode' => $manager->login_code,
        ]);

        return [$manager->fresh(), $department];
    }

    private function authenticate(User $user): array
    {
        $session = 'manager-session-'.$user->id;
        DB::table('sessions')->insert([
            'id' => $session, 'user_id' => $user->id, 'payload' => base64_encode(serialize([])), 'last_activity' => time(),
        ]);
        $token = $user->createToken('manager-session-check')->accessToken->id;

        return [$session, $token];
    }
}
