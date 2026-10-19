<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\User;
use App\Services\DashboardAccountService;
use App\Support\DepartmentContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

final class DashboardAccessEditorTest extends CoreDataApiTestCase
{
    private function createAccount(array $extra = []): array
    {
        return $this->postJson('/api/dashboard/accounts', array_merge([
            'name' => 'حساب إشرافي تجريبي', 'loginCode' => 'audit-editor', 'role' => 'male_manager', 'password' => '12345678',
        ], $extra))->assertCreated()->json();
    }

    private function updatePayload(array $account, array $extra = []): array
    {
        return array_merge(array_intersect_key($account, array_flip(['name', 'loginCode', 'role', 'isActive', 'revision'])), $extra);
    }

    public function test_accounts_can_be_edited_paused_resumed_and_password_reset_with_history_and_revoked_tokens(): void
    {
        $account = $this->createAccount();
        $user = User::findOrFail($account['id']);
        $token = $user->createToken('old-session');
        $changed = $this->putJson('/api/dashboard/accounts/'.$account['id'], $this->updatePayload($account, [
            'name' => 'اسم الحساب بعد التعديل', 'loginCode' => 'audit-editor-new', 'password' => '87654321',
        ]))->assertOk()->assertJsonPath('loginCode', 'audit-editor-new')->json();
        $this->assertTrue(Hash::check('87654321', $user->fresh()->password));
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $token->accessToken->id]);
        $this->assertDatabaseHas('reserved_login_codes', ['login_code' => 'audit-editor']);
        $this->assertDatabaseHas('reserved_login_codes', ['login_code' => 'audit-editor-new']);
        $this->putJson('/api/dashboard/accounts/'.$account['id'], $this->updatePayload($account))->assertConflict();
        $paused = $this->putJson('/api/dashboard/accounts/'.$account['id'], $this->updatePayload($changed, ['isActive' => false]))
            ->assertOk()->assertJsonPath('isActive', false)->json();
        $this->postJson('/api/auth/login', ['login_code' => 'audit-editor-new', 'password' => '87654321'])->assertUnprocessable();
        $this->putJson('/api/dashboard/accounts/'.$account['id'], $this->updatePayload($paused, ['isActive' => true]))->assertOk();
        $history = $this->getJson('/api/dashboard/access-history')->assertOk()->json();
        $this->assertCount(4, $history);
        $this->assertStringNotContainsString('87654321', json_encode($history));
        $this->assertStringNotContainsString('12345678', json_encode($history));
    }

    public function test_self_and_department_manager_cannot_be_deleted_paused_or_demoted(): void
    {
        $me = collect($this->getJson('/api/dashboard/accounts')->assertOk()->json())->firstWhere('loginCode', '9000');
        $this->assertTrue($me['isProtected']);
        $this->deleteJson('/api/dashboard/accounts/'.$me['id'])->assertUnprocessable();
        $this->putJson('/api/dashboard/accounts/'.$me['id'], $this->updatePayload($me, ['isActive' => false]))->assertUnprocessable();
        $this->putJson('/api/dashboard/accounts/'.$me['id'], $this->updatePayload($me, ['role' => 'male_manager']))->assertUnprocessable();
        $manager = $this->createAccount(['role' => 'admin']);
        DB::table('departments')->where('id', DepartmentContext::id())->update(['manager_user_id' => $manager['id']]);
        $this->deleteJson('/api/dashboard/accounts/'.$manager['id'])->assertUnprocessable();
        $this->putJson('/api/dashboard/accounts/'.$manager['id'], $this->updatePayload($manager, ['isActive' => false]))->assertUnprocessable();
    }

    public function test_invalid_credentials_roles_and_foreign_department_accounts_are_rejected(): void
    {
        $this->postJson('/api/dashboard/accounts', ['name' => 'حساب غير صالح', 'role' => 'admin', 'loginCode' => 'x', 'password' => '1'])
            ->assertUnprocessable()->assertJsonValidationErrors(['password']);
        $account = $this->createAccount();
        $this->putJson('/api/dashboard/accounts/'.$account['id'], $this->updatePayload($account, ['password' => '1']))->assertUnprocessable();
        $this->putJson('/api/dashboard/accounts/'.$account['id'], $this->updatePayload($account, ['role' => 'super_admin']))->assertUnprocessable();
        $other = Department::create(['name' => 'إدارة مستقلة']);
        $foreign = User::factory()->create(['department_id' => $other->id, 'role' => 'admin']);
        $this->putJson('/api/dashboard/accounts/'.$foreign->id, $this->updatePayload($account))->assertNotFound();
        $this->deleteJson('/api/dashboard/accounts/'.$foreign->id)->assertNotFound();
    }

    public function test_manual_permission_editor_is_retired_and_cannot_change_automatic_grants(): void
    {
        $this->getJson('/api/dashboard/role-permissions/editor')->assertStatus(410);
        $this->putJson('/api/dashboard/role-permissions/batch', [])->assertStatus(410);
        $this->putJson('/api/dashboard/role-permissions', ['role' => 'male_manager', 'key' => 'not_a_permission', 'isEnabled' => true])->assertStatus(410);
        $this->assertDatabaseMissing('role_permissions', ['permission_key' => 'not_a_permission']);
        $this->getJson('/api/dashboard/role-permissions')->assertOk()->assertJsonPath('male_manager.edit_final_questions', true);
    }

    public function test_automatic_manager_can_manage_its_branch_but_cannot_open_administration(): void
    {
        DB::table('role_permissions')->updateOrInsert(['role' => 'male_manager', 'permission_key' => 'manage_materials'], ['is_enabled' => false]);
        Sanctum::actingAs(User::factory()->create(['role' => 'male_manager']));
        foreach (['role-permissions/editor', 'access-history', 'accounts'] as $path) {
            $this->getJson('/api/dashboard/'.$path)->assertForbidden();
        }
        $this->putJson('/api/dashboard/role-permissions/batch', [])->assertForbidden();
        $this->getJson('/api/dashboard/training-materials')->assertOk();
        $this->postJson('/api/dashboard/training-materials', [])->assertUnprocessable();
        $this->postJson('/api/dashboard/notifications', [])->assertUnprocessable();
        $this->postJson('/api/dashboard/final-exam/questions', ['branchCode' => 'female'])->assertForbidden();
    }

    public function test_history_is_department_scoped(): void
    {
        $this->createAccount();
        $other = Department::create(['name' => 'إدارة ثانية']);
        Sanctum::actingAs(User::factory()->create(['role' => 'admin', 'department_id' => $other->id]));
        $this->getJson('/api/dashboard/access-history')->assertOk()->assertExactJson([]);
    }

    public function test_general_manager_cannot_remove_the_last_active_local_administrator(): void
    {
        $department = Department::create(['name' => 'إدارة بحساب وحيد']);
        $local = User::factory()->create(['role' => 'admin', 'department_id' => $department->id]);
        Sanctum::actingAs(User::factory()->create(['role' => 'super_admin', 'department_id' => null]));
        $this->withHeader('X-Department-Id', $department->id)->deleteJson('/api/dashboard/accounts/'.$local->id)->assertUnprocessable();
        $this->assertDatabaseHas('users', ['id' => $local->id, 'is_active' => true]);
    }

    public function test_only_successful_login_updates_activity_without_invalidating_an_account_draft(): void
    {
        $account = $this->createAccount();
        $this->postJson('/api/auth/login', ['login_code' => $account['loginCode'], 'password' => 'incorrect'])
            ->assertUnprocessable();
        $this->assertNull(User::findOrFail($account['id'])->last_login_at);
        $this->postJson('/api/auth/login', ['login_code' => $account['loginCode'], 'password' => '12345678'])->assertOk();
        $user = User::findOrFail($account['id']);
        $this->assertNotNull($user->last_login_at);
        $this->assertSame($account['revision'], app(DashboardAccountService::class)->serialize($user)['revision']);
    }

    public function test_legacy_permission_endpoint_cannot_disable_automatic_permissions(): void
    {
        $this->putJson('/api/dashboard/role-permissions', ['role' => 'male_manager', 'key' => 'edit_final_questions', 'isEnabled' => false])->assertStatus(410);
        $this->getJson('/api/dashboard/role-permissions')->assertOk()->assertJsonPath('male_manager.edit_final_questions', true);
        $this->getJson('/api/dashboard/access-history')->assertOk()->assertExactJson([]);
    }
}
