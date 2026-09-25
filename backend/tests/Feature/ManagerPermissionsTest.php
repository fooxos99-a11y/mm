<?php

namespace Tests\Feature;

use App\Models\RegistrationRequest;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

class ManagerPermissionsTest extends CoreDataApiTestCase
{
    public function test_manager_without_student_permission_cannot_manage_students(): void
    {
        DB::table('role_permissions')->insert([
            'role' => 'male_manager',
            'permission_key' => 'page_results',
            'is_enabled' => true,
        ]);

        Sanctum::actingAs(User::factory()->create([
            'role' => 'male_manager',
            'login_code' => '7001',
        ]));

        $this->postJson('/api/students', [
            'name' => 'Blocked Student',
            'loginId' => '8301',
            'password' => 'Secure-password-1234',
            'passwordConfirmation' => 'Secure-password-1234',
            'branchId' => 'male',
        ])->assertForbidden();
    }

    public function test_manager_cannot_update_student_outside_managed_branch(): void
    {
        $femaleBranchId = DB::table('branches')->where('code', 'female')->value('id');
        $student = Student::query()->create([
            'full_name' => 'طالبة فرع النساء',
            'login_code' => '8311',
            'branch_id' => $femaleBranchId,
        ]);
        DB::table('role_permissions')->insert([
            'role' => 'male_manager',
            'permission_key' => 'edit_student',
            'is_enabled' => true,
        ]);

        Sanctum::actingAs(User::factory()->create([
            'role' => 'male_manager',
            'login_code' => '7002',
        ]));

        $this->putJson("/api/students/{$student->id}", ['note' => 'محاولة غير مسموحة'])
            ->assertForbidden();
    }

    public function test_manager_cannot_manage_other_branch_registration_or_archives(): void
    {
        $registrationRequest = RegistrationRequest::query()->create([
            'full_name' => 'طلب معلمات',
            'login_code' => '8331',
            'phone' => '0500000000',
            'gender' => 'female',
            'status' => 'pending',
        ]);
        RegistrationRequest::query()->create([
            'full_name' => 'طلب معلمين',
            'login_code' => '8332',
            'phone' => '0500000001',
            'gender' => 'male',
            'status' => 'pending',
        ]);
        foreach (['page_registration', 'add_student', 'edit_student', 'page_archive'] as $permission) {
            DB::table('role_permissions')->updateOrInsert(
                ['role' => 'male_manager', 'permission_key' => $permission],
                ['is_enabled' => true],
            );
        }

        Sanctum::actingAs(User::factory()->create([
            'role' => 'male_manager',
            'login_code' => '7004',
        ]));

        $this->getJson('/api/dashboard/registration')
            ->assertOk()
            ->assertJsonCount(1, 'requests')
            ->assertJsonPath('requests.0.loginCode', '8332');
        $this->postJson("/api/dashboard/registration-requests/{$registrationRequest->id}/reject", ['reason' => 'رفض'])
            ->assertForbidden();
        $this->getJson('/api/dashboard/archives')->assertForbidden();
    }

    public function test_admin_only_dashboard_pages_are_not_available_to_managers_by_api(): void
    {
        DB::table('role_permissions')->insert([
            ['role' => 'male_manager', 'permission_key' => 'page_results', 'is_enabled' => true],
            ['role' => 'male_manager', 'permission_key' => 'edit_student', 'is_enabled' => true],
        ]);

        Sanctum::actingAs(User::factory()->create([
            'role' => 'male_manager',
            'login_code' => '7003',
        ]));

        $this->putJson('/api/dashboard/home-page-content', [
            'content' => ['hero' => ['title' => 'Blocked']],
        ])->assertForbidden();

        $this->putJson('/api/dashboard/practitioner-page-content', [
            'content' => ['hero' => ['title' => 'Blocked']],
        ])->assertForbidden();

        $this->postJson('/api/dashboard/final-exam/questions', [
            'branchCode' => 'male',
            'prompt' => 'Blocked question',
            'type' => 'text',
            'allowFile' => false,
            'points' => 1,
            'correctAnswer' => 'answer',
        ])->assertForbidden();

        $this->postJson('/api/dashboard/satisfaction-questions', [
            'prompt' => 'Blocked satisfaction',
            'type' => 'rating',
            'isRequired' => true,
        ])->assertForbidden();

        DB::table('role_permissions')->updateOrInsert(
            ['role' => 'male_manager', 'permission_key' => 'page_final_exam'],
            ['is_enabled' => true],
        );
        DB::table('role_permissions')->updateOrInsert(
            ['role' => 'male_manager', 'permission_key' => 'page_satisfaction'],
            ['is_enabled' => true],
        );

        $this->postJson('/api/dashboard/final-exam/questions', [
            'branchCode' => 'female',
            'prompt' => 'Wrong branch question',
            'type' => 'text',
            'allowFile' => false,
            'points' => 1,
            'correctAnswer' => 'answer',
        ])->assertForbidden();

        $this->postJson('/api/dashboard/final-exam/questions', [
            'branchCode' => 'male',
            'prompt' => 'Allowed branch question',
            'type' => 'text',
            'allowFile' => false,
            'points' => 1,
            'correctAnswer' => 'answer',
        ])->assertCreated();

        $this->postJson('/api/dashboard/satisfaction-questions', [
            'prompt' => 'Allowed satisfaction',
            'type' => 'rating',
            'isRequired' => true,
        ])->assertCreated();
    }

    public function test_training_materials_require_notifications_permission(): void
    {
        Sanctum::actingAs(User::factory()->create([
            'role' => 'male_manager',
            'login_code' => '7004',
        ]));

        DB::table('role_permissions')->insert([
            'role' => 'male_manager',
            'permission_key' => 'unrelated_permission',
            'is_enabled' => true,
        ]);

        $this->getJson('/api/dashboard/training-materials')->assertForbidden();

        DB::table('role_permissions')->where('role', 'male_manager')->delete();
        DB::table('role_permissions')->insert([
            'role' => 'male_manager',
            'permission_key' => 'page_notifications',
            'is_enabled' => true,
        ]);

        $this->getJson('/api/dashboard/training-materials')->assertForbidden();

        DB::table('role_permissions')->insert([
            'role' => 'male_manager',
            'permission_key' => 'page_materials',
            'is_enabled' => true,
        ]);

        $this->getJson('/api/dashboard/training-materials')->assertOk();
    }

    public function test_reciter_flow_and_assigned_reciter_lookup_work(): void
    {
        $student = Student::query()->create([
            'full_name' => 'طالب مرتبط',
            'login_code' => '8100',
            'branch_id' => DB::table('branches')->where('code', 'female')->value('id'),
            'note' => '',
        ]);

        $this->postJson('/api/reciters', [
            'name' => 'مقرئ جديد',
            'loginCode' => '9001',
            'password' => 'Secure-password-1234',
            'passwordConfirmation' => 'Secure-password-1234',
            'branchId' => 'female',
            'linkedStudentIds' => [$student->id],
        ])
            ->assertOk()
            ->assertJsonPath('loginCode', '9001');

        $this->getJson('/api/reciters/by-login/9001')
            ->assertOk()
            ->assertJsonPath('loginCode', '9001')
            ->assertJsonPath('students.0.loginId', '8100');

        $this->getJson('/api/students/by-login/8100/assigned-reciter')
            ->assertOk()
            ->assertJsonPath('loginCode', '9001');

        $this->deleteJson('/api/reciters/by-login/9001')
            ->assertOk();

        $this->getJson('/api/reciters/by-login/9001')
            ->assertOk()
            ->assertContent('null');
    }

    public function test_female_students_are_limited_to_ten_parts(): void
    {
        $student = Student::query()->create([
            'full_name' => 'معلمة حد الأجزاء',
            'login_code' => '7010',
            'branch_id' => DB::table('branches')->where('code', 'female')->value('id'),
            'note' => '',
        ]);

        $this->putJson('/api/students/'.$student->id, [
            'completedParts' => [1, 10, 11, 30],
        ])
            ->assertOk()
            ->assertJsonPath('completedParts.0', 1)
            ->assertJsonPath('completedParts.1', 10)
            ->assertJsonCount(2, 'completedParts');

        $this->putJson('/api/students/'.$student->id.'/parts/11', [
            'shouldMarkComplete' => true,
        ])->assertUnprocessable();

        $this->assertDatabaseMissing('student_parts', [
            'student_id' => $student->id,
            'part_number' => 11,
        ]);
    }
}
