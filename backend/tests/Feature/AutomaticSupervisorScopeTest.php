<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;

final class AutomaticSupervisorScopeTest extends CoreDataApiTestCase
{
    public static function branches(): array
    {
        return [['male', 'female'], ['female', 'male']];
    }

    #[DataProvider('branches')]
    public function test_automatic_rights_show_shared_content_but_only_own_people_records_and_statistics(string $own, string $other): void
    {
        $course = $this->course();
        $question = (string) str()->uuid();
        DB::table('course_questions')->insert(['id' => $question, 'course_id' => $course, 'assessment_type' => 'pre',
            'question_type' => 'text', 'prompt' => 'Shared content', 'correct_answer' => 'Shared answer']);
        foreach ([$own, $other] as $branch) {
            $this->submission($course, $this->student($branch));
        }
        DB::table('role_permissions')->updateOrInsert(['role' => $own.'_manager', 'permission_key' => 'page_overview'], ['is_enabled' => false]);
        $this->manager($own);
        $snapshot = $this->getJson('/api/dashboard/snapshot')->assertOk()->json();
        $this->assertCount(1, $snapshot['students']);
        $this->assertSame($own, $snapshot['students'][0]['branchId']);
        $this->assertCount(1, $snapshot['submissions']);
        $this->assertTrue($snapshot['rolePermissions'][$own.'_manager']['page_overview']);
        $this->assertSame('Shared answer', $snapshot['courses'][0]['preQuestions'][0]['correctAnswer']);
        $shell = $this->getJson('/api/dashboard/shell')->assertOk()->json();
        $this->assertCount(1, $shell['branches']);
        $this->assertSame($own, $shell['branches'][0]['id']);
        $this->assertSame([$own], array_keys($shell['overviewIndicators']));
        foreach (['accounts', 'access-history', 'archives'] as $resource) {
            $this->getJson('/api/dashboard/'.$resource)->assertForbidden();
        }
    }

    #[DataProvider('branches')]
    public function test_grading_and_task_review_cannot_cross_branch_or_department(string $own, string $other): void
    {
        $course = $this->course();
        $ownSubmission = $this->submission($course, $this->student($own));
        $foreignSubmission = $this->submission($course, $this->student($other));
        $this->manager($own);
        $this->putJson('/api/dashboard/assessment-submissions/'.$ownSubmission.'/manual-score', ['score' => 1])->assertNoContent();
        $this->assertDatabaseHas('course_submissions', ['id' => $ownSubmission, 'manual_score' => 1]);
        foreach (['manual-score' => ['score' => 1], 'task-review' => ['status' => 'approved']] as $action => $payload) {
            $this->putJson('/api/dashboard/assessment-submissions/'.$foreignSubmission.'/'.$action, $payload)->assertForbidden();
        }
        $this->assertDatabaseHas('course_submissions', ['id' => $foreignSubmission, 'manual_score' => null]);
        DB::table('departments')->insert(['id' => $department = (string) str()->uuid(), 'name' => 'Other department']);
        DB::table('course_submissions')->where('id', $foreignSubmission)->update(['department_id' => $department]);
        $this->putJson('/api/dashboard/assessment-submissions/'.$foreignSubmission.'/manual-score', ['score' => 1])->assertNotFound();
    }

    #[DataProvider('branches')]
    public function test_final_exam_grades_belong_only_to_the_supervisors_branch(string $own, string $other): void
    {
        $submissions = [];
        foreach ([$own, $other] as $branch) {
            $student = $this->student($branch);
            $submissions[$branch] = $id = (string) str()->uuid();
            DB::table('final_exam_submissions')->insert(['id' => $id, 'branch_code' => $branch,
                'student_name' => $student->full_name, 'login_code' => $student->login_code]);
        }
        $this->manager($own);
        $this->putJson('/api/dashboard/final-exam/submissions/'.$submissions[$own].'/manual-score', ['score' => 1])->assertNoContent();
        $this->putJson('/api/dashboard/final-exam/submissions/'.$submissions[$other].'/manual-score', ['score' => 1])->assertForbidden();
        $this->assertDatabaseHas('final_exam_submissions', ['id' => $submissions[$own], 'manual_score' => 1]);
        $this->assertDatabaseHas('final_exam_submissions', ['id' => $submissions[$other], 'manual_score' => null]);
    }

    #[DataProvider('branches')]
    public function test_opening_a_previously_disabled_assessment_notifies_only_own_branch(string $own, string $other): void
    {
        $course = $this->course(['is_active' => true, 'is_pre_enabled' => false,
            'assessment_notification_templates' => json_encode(['pre' => 'فُتح الاختبار: {branchLabel}'])]);
        $this->manager($own);
        $this->postJson('/api/dashboard/courses/'.$course.'/activate', ['pre' => true, 'post' => false, 'tasks' => false])->assertNoContent();
        $this->assertDatabaseHas('notifications', ['target_branch_code' => $own]);
        $this->assertDatabaseMissing('notifications', ['target_branch_code' => $other]);
    }

    #[DataProvider('branches')]
    public function test_window_then_activation_flow_sends_one_notification_to_own_branch(string $own, string $other): void
    {
        $course = $this->course(['assessment_notification_templates' => json_encode(['pre' => 'فتح قبلي', 'post' => 'فتح بعدي'])]);
        $this->manager($own);
        $this->putJson('/api/dashboard/courses/'.$course, [
            'branchAvailability' => [$own => ['pre' => true, 'post' => true]],
            'assessmentWindows' => [$own => ['pre' => ['opensAt' => now()->toISOString(), 'closesAt' => now()->addHour()->toISOString()]]],
        ])->assertNoContent();
        $this->postJson('/api/dashboard/courses/'.$course.'/activate', ['pre' => true, 'post' => false, 'tasks' => false])->assertNoContent();
        $this->assertDatabaseCount('notifications', 1);
        $this->assertDatabaseHas('notifications', ['target_branch_code' => $own, 'message' => 'فتح قبلي']);
        $this->assertDatabaseMissing('notifications', ['target_branch_code' => $other]);
    }

    #[DataProvider('branches')]
    public function test_course_activation_and_deactivation_preserve_other_branch_windows_and_access(string $own, string $other): void
    {
        $old = $this->course(['is_active' => true, 'assessment_windows' => json_encode(['global' => ['pre' => ['closesAt' => '2030-01-01T10:00:00Z']]])]);
        $next = $this->course();
        $this->manager($own);
        $this->postJson('/api/dashboard/courses/'.$next.'/activate', ['pre' => true, 'post' => false, 'tasks' => false])->assertNoContent();
        $this->assertDatabaseHas('courses', ['id' => $old, 'is_active' => true, $own.'_pre_enabled' => false, $other.'_pre_enabled' => true]);
        $this->assertDatabaseHas('courses', ['id' => $next, 'is_active' => true, $own.'_pre_enabled' => true, $other.'_pre_enabled' => false]);
        $windows = json_decode(DB::table('courses')->where('id', $old)->value('assessment_windows'), true);
        $this->assertSame('2030-01-01T10:00:00Z', $windows[$other]['pre']['closesAt']);
        $this->assertNull($windows[$own]['pre']);
        $this->putJson('/api/dashboard/courses/'.$old, ['assessmentWindows' => ['global' => ['pre' => null]]])->assertForbidden();
        $this->postJson('/api/dashboard/courses/deactivate-all')->assertNoContent();
        $this->assertDatabaseHas('courses', ['id' => $old, 'is_active' => true, $other.'_pre_enabled' => true]);
        $this->assertDatabaseHas('courses', ['id' => $next, 'is_active' => false]);
        $this->manager($other);
        $courses = collect($this->getJson('/api/dashboard/snapshot')->assertOk()->json('courses'))->keyBy('id');
        $this->assertTrue($courses[$old]['isActive']);
        $this->assertFalse($courses[$next]['isActive']);
    }

    #[DataProvider('branches')]
    public function test_opening_a_task_does_not_close_other_branch_task_or_delete_its_records(string $own, string $other): void
    {
        $old = $this->course(['entity_type' => 'task', 'task_mode' => 'questions', 'is_active' => true, 'is_tasks_enabled' => true]);
        $next = $this->course(['entity_type' => 'task', 'task_mode' => 'questions']);
        $foreign = $this->submission($old, $this->student($other));
        $this->manager($own);
        $this->putJson('/api/dashboard/courses/'.$next, ['isTasksEnabled' => true, 'isActive' => true])->assertNoContent();
        $this->assertDatabaseHas('courses', ['id' => $old, $own.'_tasks_enabled' => false, $other.'_tasks_enabled' => true, 'is_active' => true]);
        $this->assertDatabaseHas('courses', ['id' => $next, $own.'_tasks_enabled' => true, $other.'_tasks_enabled' => false]);
        $this->deleteJson('/api/dashboard/courses/'.$old)->assertForbidden();
        $this->assertDatabaseHas('course_submissions', ['id' => $foreign]);
    }

    private function manager(string $branch): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => $branch.'_manager']));
    }

    private function course(array $attributes = []): string
    {
        $id = (string) str()->uuid();
        DB::table('courses')->insert(['id' => $id, 'title' => 'Shared course', 'is_active' => false,
            'is_pre_enabled' => true, 'is_post_enabled' => true, 'is_tasks_enabled' => false,
            'male_pre_enabled' => true, 'female_pre_enabled' => true, 'male_post_enabled' => true,
            'female_post_enabled' => true, 'male_tasks_enabled' => true, 'female_tasks_enabled' => true, ...$attributes]);

        return $id;
    }

    private function student(string $branch): Student
    {
        return Student::query()->create(['full_name' => $branch.' Person', 'login_code' => (string) str()->uuid(),
            'branch_id' => DB::table('branches')->where('code', $branch)->value('id')]);
    }

    private function submission(string $course, Student $student): string
    {
        $id = (string) str()->uuid();
        DB::table('course_submissions')->insert(['id' => $id, 'course_id' => $course, 'assessment_type' => 'pre',
            'student_name' => $student->full_name, 'student_id' => $student->id, 'login_code' => $student->login_code]);

        return $id;
    }
}
