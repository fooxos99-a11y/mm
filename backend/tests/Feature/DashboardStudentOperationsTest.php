<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

class DashboardStudentOperationsTest extends CoreDataApiTestCase
{
    public function test_dashboard_snapshot_and_transfer_student_work(): void
    {
        $maleBranchId = DB::table('branches')->where('code', 'male')->value('id');

        $student = Student::query()->create([
            'full_name' => 'طالب تحويل',
            'login_code' => '8300',
            'branch_id' => $maleBranchId,
            'note' => 'ملاحظة تحويل',
        ]);

        $firstReciterResponse = $this->postJson('/api/reciters', [
            'name' => 'مقرئ أول',
            'loginCode' => '9101',
            'password' => 'Secure-password-1234',
            'passwordConfirmation' => 'Secure-password-1234',
            'branchId' => 'male',
            'linkedStudentIds' => [$student->id],
        ])->assertOk();

        $secondReciterResponse = $this->postJson('/api/reciters', [
            'name' => 'مقرئ ثان',
            'loginCode' => '9102',
            'password' => 'Secure-password-1234',
            'passwordConfirmation' => 'Secure-password-1234',
            'branchId' => 'male',
            'linkedStudentIds' => [],
        ])->assertOk();

        $snapshot = $this->getJson('/api/dashboard/snapshot');

        $snapshot
            ->assertOk()
            ->assertJsonPath('students.0.loginId', '8300')
            ->assertJsonPath('reciters.0.loginCode', '9101')
            ->assertJsonStructure([
                'roles',
                'branches',
                'students',
                'reciters',
                'courses',
                'taskTemplates',
                'submissions',
                'attendance',
                'notifications',
                'satisfactionQuestions',
                'satisfactionResponses',
                'finalExamQuestions',
                'finalExamSubmissions',
                'finalExamSettings',
                'rolePermissions',
            ]);

        $this->postJson('/api/dashboard/transfer-student', [
            'studentId' => $student->id,
            'targetReciterId' => $secondReciterResponse->json('id'),
        ])->assertNoContent();

        $this->getJson('/api/students/by-login/8300/assigned-reciter')
            ->assertOk()
            ->assertJsonPath('loginCode', '9102');

        $this->assertDatabaseMissing('reciter_students', [
            'reciter_id' => $firstReciterResponse->json('id'),
            'student_id' => $student->id,
        ]);

        $this->assertDatabaseHas('reciter_students', [
            'reciter_id' => $secondReciterResponse->json('id'),
            'student_id' => $student->id,
        ]);
    }

    public function test_toggle_student_part_notifications_and_role_permissions_work(): void
    {
        $maleBranchId = DB::table('branches')->where('code', 'male')->value('id');

        $student = Student::query()->create([
            'full_name' => 'طالب أجزاء',
            'login_code' => '8400',
            'branch_id' => $maleBranchId,
            'note' => '',
        ]);

        $reciterResponse = $this->postJson('/api/reciters', [
            'name' => 'مقرئ أجزاء',
            'loginCode' => '9201',
            'password' => 'Secure-password-1234',
            'passwordConfirmation' => 'Secure-password-1234',
            'branchId' => 'male',
            'linkedStudentIds' => [$student->id],
        ])->assertOk();

        $reciterId = $reciterResponse->json('id');

        $this->putJson('/api/students/'.$student->id.'/parts/7', [
            'reciterId' => $reciterId,
            'shouldMarkComplete' => true,
        ])->assertNoContent();

        $this->assertDatabaseHas('student_parts', [
            'student_id' => $student->id,
            'part_number' => 7,
            'marked_by_reciter_id' => $reciterId,
        ]);
        $this->putJson('/api/students/'.$student->id.'/parts/7', [
            'reciterId' => $reciterId,
            'shouldMarkComplete' => false,
        ])->assertNoContent();

        $this->assertDatabaseMissing('student_parts', [
            'student_id' => $student->id,
            'part_number' => 7,
        ]);

        $this->putJson('/api/students/'.$student->id.'/parts/8', [
            'reciterId' => null,
            'shouldMarkComplete' => true,
        ])->assertNoContent();

        $this->assertDatabaseHas('student_parts', [
            'student_id' => $student->id,
            'part_number' => 8,
            'marked_by_reciter_id' => null,
        ]);

        $notificationResponse = $this->postJson('/api/dashboard/notifications', [
            'title' => 'تنبيه',
            'message' => 'تم فتح الاختبار.',
            'targetBranchId' => 'male',
            'targetLoginIds' => ['8400'],
            'createdByName' => 'مشرف النظام',
            'createdByRole' => 'admin',
        ]);

        $notificationId = $notificationResponse->json('id');

        $notificationResponse->assertCreated();

        $this->getJson('/api/dashboard/notifications')
            ->assertOk()
            ->assertJsonPath('0.targetLoginIds.0', '8400');

        $this->deleteJson('/api/dashboard/notifications/'.$notificationId)
            ->assertNoContent();

        $this->assertDatabaseMissing('notifications', ['id' => $notificationId]);

        $this->putJson('/api/dashboard/role-permissions', [
            'role' => 'male_manager',
            'key' => 'transfer_reciter_student',
            'isEnabled' => true,
        ])->assertNoContent();

        $this->getJson('/api/dashboard/role-permissions')
            ->assertOk()
            ->assertJsonPath('male_manager.transfer_reciter_student', true);
    }

    public function test_branch_manager_snapshot_is_limited_to_the_managed_branch(): void
    {
        $maleCourseId = (string) Str::uuid();

        $this->postJson('/api/students', [
            'name' => 'متدرب فرع الرجال',
            'loginId' => '7101',
            'password' => 'Secure-password-1234',
            'passwordConfirmation' => 'Secure-password-1234',
            'branchId' => 'male',
        ])->assertCreated();

        $this->postJson('/api/students', [
            'name' => 'متدربة فرع النساء',
            'loginId' => '7102',
            'password' => 'Secure-password-1234',
            'passwordConfirmation' => 'Secure-password-1234',
            'branchId' => 'female',
        ])->assertCreated();

        DB::table('courses')->insert([
            'id' => $maleCourseId,
            'title' => 'دورة الفرعين',
            'entity_type' => 'course',
            'is_active' => true,
            'is_pre_enabled' => true,
            'is_post_enabled' => true,
            'is_tasks_enabled' => false,
            'male_pre_enabled' => true,
            'female_pre_enabled' => true,
            'male_post_enabled' => true,
            'female_post_enabled' => true,
            'male_tasks_enabled' => true,
            'female_tasks_enabled' => true,
            'assessment_windows' => json_encode(['global' => [], 'male' => [], 'female' => []], JSON_UNESCAPED_UNICODE),
            'assessment_notification_templates' => json_encode(
                ['pre' => '', 'post' => '', 'tasks' => ''],
                JSON_UNESCAPED_UNICODE
            ),
            'sort_order' => 0,
            'created_at' => now(),
        ]);

        DB::table('course_submissions')->insert([
            [
                'id' => (string) Str::uuid(),
                'course_id' => $maleCourseId,
                'assessment_type' => 'pre',
                'student_name' => 'متدرب فرع الرجال',
                'login_code' => '7101',
                'manual_score' => null,
                'submitted_at' => now(),
            ],
            [
                'id' => (string) Str::uuid(),
                'course_id' => $maleCourseId,
                'assessment_type' => 'pre',
                'student_name' => 'متدربة فرع النساء',
                'login_code' => '7102',
                'manual_score' => null,
                'submitted_at' => now(),
            ],
        ]);

        DB::table('course_attendance')->insert([
            [
                'id' => (string) Str::uuid(),
                'course_id' => $maleCourseId,
                'student_name' => 'متدرب فرع الرجال',
                'login_code' => '7101',
                'source' => 'manual',
                'created_at' => now(),
            ],
            [
                'id' => (string) Str::uuid(),
                'course_id' => $maleCourseId,
                'student_name' => 'متدربة فرع النساء',
                'login_code' => '7102',
                'source' => 'manual',
                'created_at' => now(),
            ],
        ]);

        DB::table('role_permissions')->updateOrInsert(
            ['role' => 'male_manager', 'permission_key' => 'transfer_reciter_student'],
            ['is_enabled' => true],
        );
        DB::table('role_permissions')->updateOrInsert(
            ['role' => 'male_manager', 'permission_key' => 'page_completion_requirements'],
            ['is_enabled' => true],
        );

        Sanctum::actingAs(User::factory()->create([
            'role' => 'male_manager',
            'login_code' => '9001',
        ]));

        $this->getJson('/api/dashboard/snapshot')
            ->assertOk()
            ->assertJsonCount(1, 'branches')
            ->assertJsonPath('branches.0.id', 'male')
            ->assertJsonCount(1, 'students')
            ->assertJsonPath('students.0.loginId', '7101')
            ->assertJsonCount(1, 'submissions')
            ->assertJsonPath('submissions.0.loginId', '7101')
            ->assertJsonCount(1, 'attendance')
            ->assertJsonPath('attendance.0.loginId', '7101');

        $this->getJson('/api/dashboard/completion-requirements/male')->assertOk();
        $this->getJson('/api/dashboard/completion-requirements/female')->assertForbidden();
    }
}
