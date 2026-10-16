<?php

namespace Tests\Feature;

use App\Events\DashboardNotificationCreated;
use App\Models\User;
use App\Services\ArchiveLifecycleService;
use App\Services\CourseManagementService;
use App\Services\DashboardAccountService;
use App\Services\DashboardCommunicationService;
use App\Services\RegistrationService;
use App\Services\StudentAccountService;
use App\Services\UserManagementService;
use App\Support\DepartmentContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class DepartmentDomainServiceIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        DepartmentContext::reset();
        parent::setUp();
        config(['cache.stores.redis' => ['driver' => 'array']]);
    }

    protected function tearDown(): void
    {
        DepartmentContext::reset();
        parent::tearDown();
    }

    private function department(string $name): string
    {
        $id = (string) Str::uuid();
        DB::table('departments')->insert([
            'id' => $id, 'name' => $name, 'manager_title' => 'مسؤول الإدارة',
            'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);

        return $id;
    }

    private function actor(string $departmentId, string $loginCode): User
    {
        return User::factory()->create([
            'department_id' => $departmentId, 'role' => 'admin', 'login_code' => $loginCode,
        ]);
    }

    private function duplicate(callable $callback): void
    {
        try {
            $callback();
            $this->fail('A globally reserved login number was accepted.');
        } catch (ValidationException $exception) {
            $this->assertNotEmpty($exception->errors());
        }
    }

    public function test_account_creation_inherits_department_and_lists_and_deletions_are_isolated(): void
    {
        $first = $this->department('الأولى');
        $second = $this->department('الثانية');
        DepartmentContext::set($first);
        $accounts = app(DashboardAccountService::class);
        $firstAccount = $accounts->create('مسؤول أول', '1483', 'admin', '12345678');
        $teacher = app(StudentAccountService::class)->create('معلم', '924', 'male', '', Hash::make('12345678'));
        $this->assertSame($first, $teacher->department_id);
        $this->assertDatabaseHas('users', ['login_code' => '924', 'department_id' => $first]);

        DepartmentContext::set($second);
        $secondAccount = $accounts->create('مسؤول ثان', '1484', 'admin', '12345678');
        $this->assertSame([$secondAccount->id], array_column($accounts->list(), 'id'));
        $accounts->delete($firstAccount->id);
        $this->assertDatabaseHas('users', ['id' => $firstAccount->id]);
        $this->duplicate(fn () => app(StudentAccountService::class)->create('مكرر', '924', 'male', '', null));
    }

    public function test_activating_and_deactivating_courses_does_not_change_another_department(): void
    {
        $first = $this->department('الأولى');
        $second = $this->department('الثانية');
        $courses = app(CourseManagementService::class);
        DepartmentContext::set($first);
        $firstCourse = $courses->createCourse('دورة أولى', true);
        DepartmentContext::set($second);
        $secondCourse = $courses->createCourse('دورة ثانية', true);
        $this->assertDatabaseHas('courses', ['id' => $firstCourse['id'], 'is_active' => true]);
        $courses->deactivateAllCourses();
        $this->assertDatabaseHas('courses', ['id' => $firstCourse['id'], 'is_active' => true]);
        $this->assertDatabaseHas('courses', ['id' => $secondCourse['id'], 'is_active' => false]);
        $this->duplicate(fn () => $courses->activateCourse($firstCourse['id']));
    }

    public function test_login_rename_reserves_old_number_and_allows_only_its_original_owner_to_restore_it(): void
    {
        $first = $this->department('الأولى');
        $second = $this->department('الثانية');
        DepartmentContext::set($first);
        $teacher = app(StudentAccountService::class)->create('معلم', '924', 'male', '', null);
        $people = app(UserManagementService::class);
        $teacher = $people->updateStudent($teacher, ['loginCode' => '925']);
        $this->assertSame('925', $teacher->login_code);
        $teacher = $people->updateStudent($teacher, ['loginCode' => '924']);
        $this->assertSame('924', $teacher->login_code);
        DepartmentContext::set($second);
        $this->duplicate(fn () => app(StudentAccountService::class)->create('مكرر', '925', 'male', '', null));
    }

    public function test_reciter_cannot_be_edited_or_linked_across_departments(): void
    {
        $first = $this->department('الأولى');
        $second = $this->department('الثانية');
        $people = app(UserManagementService::class);
        DepartmentContext::set($first);
        $teacher = app(StudentAccountService::class)->create('معلم', '924', 'male', '', null);
        $people->saveReciter(null, 'مقرئ أول', '925', 'male');
        DepartmentContext::set($second);
        $this->assertNull($people->getReciterAccountByLoginCode('925'));
        $this->assertNull($people->deleteReciterByLoginCode('925'));
        $this->duplicate(fn () => $people->saveReciter('925', 'تغيير غير مصرح', '926', 'male'));
        $this->duplicate(fn () => $people->saveReciter(null, 'مقرئ ثان', '927', 'male', [$teacher->id]));
        $this->assertDatabaseMissing('users', ['login_code' => '927']);
        $this->assertDatabaseHas('users', ['login_code' => '925', 'department_id' => $first]);
    }

    public function test_registration_settings_and_pending_requests_are_department_specific(): void
    {
        $first = $this->department('الأولى');
        $second = $this->department('الثانية');
        $registration = app(RegistrationService::class);
        foreach ([$first, $second] as $departmentId) {
            DepartmentContext::set($departmentId);
            $registration->updateRegistrationSettings(true);
            $registration->createRegistrationRequest('طلب إدارة', '0501234567', 'male', [], 22);
        }
        $this->assertSame(2, DB::table('registration_requests')->count());
        $this->assertCount(1, $registration->loadRegistrationDashboardData()['requests']);
        $registration->updateRegistrationSettings(false);
        DepartmentContext::set($first);
        $this->assertTrue($registration->loadRegistrationPublicStatus()['isOpen']);
    }

    public function test_notification_cache_and_broadcast_channel_use_the_department(): void
    {
        $first = $this->department('الأولى');
        $second = $this->department('الثانية');
        $communications = app(DashboardCommunicationService::class);
        DepartmentContext::set($first);
        $this->actingAs($this->actor($first, '1483'));
        $payload = $communications->addNotification(['title' => 'للأولى', 'message' => 'محتوى الأولى']);
        $this->assertCount(1, $communications->loadNotifications());
        $event = new DashboardNotificationCreated($payload);
        DepartmentContext::set($second);
        $this->actingAs($this->actor($second, '1484'));
        $this->assertSame([], $communications->loadNotifications());
        $this->assertSame('private-departments.'.$first.'.dashboard.notifications.all', $event->broadcastOn()[0]->name);
    }

    public function test_archive_keeps_other_department_running_and_preserves_login_reservation(): void
    {
        $first = $this->department('الأولى');
        $second = $this->department('الثانية');
        $students = app(StudentAccountService::class);
        DepartmentContext::set($first);
        $teacher = $students->create('معلم أول', '924', 'male', '', null);
        DepartmentContext::set($second);
        $other = $students->create('معلم ثان', '925', 'male', '', null);
        $course = app(CourseManagementService::class)->createCourse('دورة مستمرة', true);
        DepartmentContext::set($first);
        $archive = app(ArchiveLifecycleService::class)->archiveAll(['name' => 'دفعة أولى', 'batch_type' => 'all']);
        $this->assertDatabaseHas('students', ['id' => $teacher->id, 'archive_id' => $archive->id]);
        $this->assertDatabaseHas('students', ['id' => $other->id, 'archive_id' => null]);
        $this->assertDatabaseHas('users', ['login_code' => '925', 'department_id' => $second]);
        $this->assertDatabaseHas('courses', ['id' => $course['id'], 'is_active' => true]);
        $this->assertDatabaseHas('reserved_login_codes', ['login_code' => '924']);
        DepartmentContext::set($second);
        $this->duplicate(fn () => $students->create('لا يعاد الرقم', '924', 'male', '', null));
    }

    public function test_foreign_login_cannot_receive_results_or_preempt_its_own_department_final_exam(): void
    {
        $first = $this->department('الأولى');
        $second = $this->department('الثانية');
        DepartmentContext::set($second);
        app(StudentAccountService::class)->create('المعلم الحقيقي', '924', 'male', '', null);
        DepartmentContext::set($first);
        $actor = $this->actor($first, '1483');
        $this->actingAs($actor);
        $course = app(CourseManagementService::class)->createCourse('دورة أولى', true);
        $satisfaction = app(\App\Services\SatisfactionService::class);
        $question = $satisfaction->addSatisfactionQuestion('رضا', 'rating', true, 'course', $course['id'])[0];
        $submission = ['loginId' => '924', 'studentName' => 'اسم منتحل', 'answers' => []];
        $assessments = app(\App\Services\CourseAssessmentService::class);
        $this->duplicate(fn () => $assessments->submitAssessment($course['id'], 'pre', $submission));
        $this->duplicate(fn () => $assessments->bulkImportAssessments($course['id'], 'pre', [
            [...$submission, 'manualScore' => 80],
        ]));
        $this->duplicate(fn () => $satisfaction->submitSatisfactionResponses([[
            'questionId' => $question['id'], 'courseId' => $course['id'],
            'loginCode' => '924', 'studentName' => 'اسم منتحل', 'ratingValue' => 10,
        ]]));
        $this->duplicate(fn () => app(\App\Services\ManualAttendanceService::class)
            ->save($actor, $course['id'], [['loginId' => '924']], 'male'));
        $final = app(\App\Services\FinalExamService::class);
        $this->duplicate(fn () => $final->submitFinalExam([
            'loginCode' => '924', 'studentName' => 'اسم منتحل', 'branchCode' => 'male', 'answers' => [],
        ]));
        $this->assertDatabaseCount('final_exam_submissions', 0);

        DepartmentContext::set($second);
        $this->actingAs($this->actor($second, '1484'));
        $final->updateFinalExamSetting('male', true, null, '');
        $final->submitFinalExam(['loginCode' => '924', 'studentName' => 'المعلم الحقيقي', 'branchCode' => 'male', 'answers' => []]);
        $this->assertDatabaseHas('final_exam_submissions', ['login_code' => '924', 'department_id' => $second]);
    }

    public function test_unknown_legacy_results_reserve_number_for_first_department_and_allow_subsequent_own_results(): void
    {
        $first = $this->department('الأولى');
        $second = $this->department('الثانية');
        DepartmentContext::set($first);
        $this->actingAs($this->actor($first, '1483'));
        $final = app(\App\Services\FinalExamService::class);
        $final->updateFinalExamSetting('male', true, null, '');
        $final->submitFinalExam(['loginCode' => 'legacy-7000', 'studentName' => 'استيراد قديم', 'branchCode' => 'male', 'answers' => []]);
        $this->assertDatabaseHas('reserved_login_codes', ['login_code' => 'legacy-7000', 'department_id' => $first, 'user_id' => null]);
        $course = app(CourseManagementService::class)->createCourse('دورة قديمة', true);
        app(\App\Services\CourseAssessmentService::class)->submitAssessment($course['id'], 'pre', [
            'loginId' => 'legacy-7000', 'studentName' => 'استيراد قديم', 'answers' => [],
        ]);
        $this->assertDatabaseHas('course_submissions', ['login_code' => 'legacy-7000', 'department_id' => $first]);
        DepartmentContext::set($second);
        $this->actingAs($this->actor($second, '1484'));
        $this->duplicate(fn () => $final->submitFinalExam([
            'loginCode' => 'legacy-7000', 'studentName' => 'إدارة أخرى', 'branchCode' => 'male', 'answers' => [],
        ]));
        $this->duplicate(fn () => app(StudentAccountService::class)->create('لا يستولي على الرقم', 'legacy-7000', 'male', '', null));
        $this->assertSame(1, DB::table('final_exam_submissions')->where('login_code', 'legacy-7000')->count());
    }

    public function test_raw_foreign_legacy_result_and_unowned_reservation_cannot_be_claimed(): void
    {
        $first = $this->department('الأولى');
        $second = $this->department('الثانية');
        DB::table('final_exam_submissions')->insert([
            'id' => (string) Str::uuid(), 'department_id' => $second, 'branch_code' => 'male',
            'login_code' => 'raw-7001', 'student_name' => 'سجل قديم', 'submitted_at' => now(),
        ]);
        DB::table('reserved_login_codes')->insert([
            'login_code' => 'unknown-owner', 'user_id' => null, 'department_id' => null, 'created_at' => now(),
        ]);
        DepartmentContext::set($first);
        $this->actingAs($this->actor($first, '1483'));
        foreach (['raw-7001', 'unknown-owner'] as $code) {
            $this->duplicate(fn () => app(\App\Services\FinalExamService::class)->submitFinalExam([
                'loginCode' => $code, 'studentName' => 'محاولة استحواذ', 'branchCode' => 'male', 'answers' => [],
            ]));
        }
        $this->assertDatabaseMissing('reserved_login_codes', ['login_code' => 'raw-7001']);
        $this->assertDatabaseCount('final_exam_submissions', 1);
    }
}
