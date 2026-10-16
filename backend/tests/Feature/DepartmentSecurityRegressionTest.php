<?php

namespace Tests\Feature;

use App\Models\Archive;
use App\Models\Department;
use App\Models\Reciter;
use App\Models\Student;
use App\Models\User;
use App\Services\AssessmentAttachmentService;
use App\Services\DepartmentManagementService;
use App\Support\DepartmentContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class DepartmentSecurityRegressionTest extends TestCase
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

    public function test_local_administrator_cannot_promote_self_or_assign_a_global_context(): void
    {
        $local = User::factory()->create(['role' => 'admin']);
        $other = Department::create(['name' => 'إدارة أخرى']);
        Sanctum::actingAs($local);

        $this->putJson('/api/management/context', ['departmentId' => $other->id])->assertForbidden();
        $this->postJson('/api/management/departments', [
            'name' => 'إدارة مزورة', 'managerTitle' => 'المدير العام', 'managerLoginCode' => $local->login_code,
        ])->assertForbidden();
        $this->postJson('/api/dashboard/accounts', [
            'name' => 'مدير مزور', 'loginId' => '9999', 'password' => '12345678',
            'passwordConfirmation' => '12345678', 'role' => 'super_admin',
        ])->assertUnprocessable();
        $this->assertDatabaseHas('users', ['id' => $local->id, 'role' => 'admin', 'department_id' => DepartmentContext::DEFAULT_ID]);
        $this->assertDatabaseMissing('users', ['login_code' => '9999']);
    }

    public function test_general_manager_can_recover_from_suspended_selected_department(): void
    {
        $department = Department::create(['name' => 'إدارة موقوفة', 'is_active' => false]);
        $general = User::factory()->create(['role' => 'super_admin', 'department_id' => null]);
        Sanctum::actingAs($general);

        $this->withHeader('X-Department-Id', $department->id)->getJson('/api/auth/session')
            ->assertOk()->assertJsonPath('user.role', 'super_admin')->assertJsonPath('user.departmentId', null);
        $this->getJson('/api/management/departments')->assertOk();
        $this->putJson('/api/management/context', ['departmentId' => null])->assertOk()
            ->assertJsonPath('user.role', 'super_admin');
        $this->getJson('/api/dashboard/shell')->assertNotFound();
    }

    public function test_suspending_original_department_does_not_hide_active_public_department_catalogue(): void
    {
        DB::table('departments')->where('id', DepartmentContext::DEFAULT_ID)->update(['is_active' => false]);
        $active = Department::create(['name' => 'إدارة متاحة', 'is_active' => true]);

        $this->getJson('/api/public/departments')->assertOk()->assertJsonCount(1, 'departments')
            ->assertJsonPath('departments.0.id', $active->id);
    }

    public function test_replacing_manager_revokes_sessions_and_tokens_and_keeps_historical_department(): void
    {
        $old = User::factory()->create(['role' => 'unassigned', 'department_id' => null]);
        $service = app(DepartmentManagementService::class);
        $department = $service->save([
            'name' => 'إدارة مستقلة', 'managerTitle' => 'مدير التدريب', 'managerLoginCode' => $old->login_code,
        ]);
        $old = $old->fresh();
        $token = $old->createToken('before-replacement');
        DB::table('sessions')->insert([
            'id' => 'old-manager-session', 'user_id' => $old->id,
            'payload' => base64_encode(serialize([])), 'last_activity' => time(),
        ]);
        $archive = DepartmentContext::run($department['id'], fn () => Archive::create(['name' => 'سجل تاريخي']));
        $new = User::factory()->create(['role' => 'unassigned', 'department_id' => null]);

        $service->save([
            'name' => 'إدارة مستقلة', 'managerTitle' => 'مسؤول التأهيل', 'managerLoginCode' => $new->login_code,
        ], $department['id']);

        $this->assertDatabaseHas('users', ['id' => $old->id, 'role' => 'unassigned', 'department_id' => null]);
        $this->assertDatabaseHas('users', ['id' => $new->id, 'role' => 'admin', 'department_id' => $department['id']]);
        $this->assertDatabaseMissing('sessions', ['id' => 'old-manager-session']);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $token->accessToken->id]);
        $this->assertDatabaseHas('archives', ['id' => $archive->id, 'department_id' => $department['id']]);
        Sanctum::actingAs($old->fresh());
        $this->getJson('/api/dashboard/shell')->assertForbidden();
    }

    public function test_signed_question_attachment_cannot_be_used_by_another_department_even_with_forged_header(): void
    {
        Storage::fake('local');
        $path = 'assessment-attachments/private-question.pdf';
        Storage::disk('local')->put($path, '%PDF-1.4 private');
        $course = (string) Str::uuid();
        DB::table('courses')->insert(['id' => $course, 'title' => 'دورة خاصة']);
        DB::table('course_questions')->insert([
            'id' => (string) Str::uuid(), 'course_id' => $course, 'assessment_type' => 'pre',
            'question_type' => 'text', 'prompt' => 'سؤال', 'attachment_path' => $path,
        ]);
        $url = app(AssessmentAttachmentService::class)->temporaryUrl($path);
        $own = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($own);
        $this->get($url)->assertOk();

        $other = Department::create(['name' => 'إدارة ثانية']);
        $foreign = User::factory()->create(['role' => 'admin', 'department_id' => $other->id]);
        Sanctum::actingAs($foreign);
        $this->get($url)->assertForbidden();
        $this->withHeader('X-Department-Id', $other->id)->get($url)->assertNotFound();
        $this->withHeader('X-Department-Id', DepartmentContext::DEFAULT_ID)->get($url)->assertForbidden();
    }

    public function test_signed_answer_attachment_is_restricted_to_its_student_within_department(): void
    {
        Storage::fake('local');
        $path = 'assessment-attachments/private-answer.pdf';
        Storage::disk('local')->put($path, '%PDF-1.4 private');
        $course = (string) Str::uuid();
        $submission = (string) Str::uuid();
        $question = (string) Str::uuid();
        DB::table('courses')->insert(['id' => $course, 'title' => 'دورة خاصة']);
        DB::table('course_questions')->insert([
            'id' => $question, 'course_id' => $course, 'assessment_type' => 'pre',
            'question_type' => 'text', 'prompt' => 'سؤال',
        ]);
        DB::table('course_submissions')->insert([
            'id' => $submission, 'course_id' => $course, 'assessment_type' => 'pre',
            'login_code' => 'student-one', 'student_name' => 'المعلم الأول',
        ]);
        DB::table('course_submission_answers')->insert([
            'id' => (string) Str::uuid(), 'submission_id' => $submission, 'question_id' => $question,
            'file_path' => $path, 'file_name' => 'answer.pdf', 'file_type' => 'application/pdf',
        ]);
        $url = app(AssessmentAttachmentService::class)->temporaryUrl($path);
        $owner = User::factory()->create(['role' => 'student', 'login_code' => 'student-one']);
        $other = User::factory()->create(['role' => 'student', 'login_code' => 'student-two']);

        Sanctum::actingAs($owner);
        $this->get($url)->assertOk();
        Sanctum::actingAs($other);
        $this->get($url)->assertNotFound();
    }

    public function test_final_question_attachment_respects_student_trainee_and_reciter_branch(): void
    {
        Storage::fake('local');
        $urls = [];
        foreach (['male', 'female'] as $branch) {
            $path = 'assessment-attachments/final-'.$branch.'.pdf';
            Storage::disk('local')->put($path, '%PDF-1.4 private');
            DB::table('final_exam_questions')->insert([
                'id' => (string) Str::uuid(), 'branch_code' => $branch, 'question_type' => 'text',
                'prompt' => 'سؤال '.$branch, 'attachment_path' => $path,
            ]);
            $urls[$branch] = app(AssessmentAttachmentService::class)->temporaryUrl($path);
        }
        $maleBranchId = DB::table('branches')->where('code', 'male')->value('id');
        foreach (['student', 'trainee', 'reciter'] as $role) {
            $user = User::factory()->create(['role' => $role, 'login_code' => 'attachment-'.$role]);
            if ($role === 'reciter') {
                Reciter::create(['full_name' => 'مقرئ', 'user_id' => $user->id, 'branch_id' => $maleBranchId]);
            } else {
                Student::create(['full_name' => 'معلم', 'login_code' => $user->login_code, 'branch_id' => $maleBranchId]);
            }
            Sanctum::actingAs($user);
            $this->get($urls['male'])->assertOk();
            $this->get($urls['female'])->assertNotFound();
        }
    }
}
