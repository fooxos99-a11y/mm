<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use App\Services\DepartmentManagementService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

class AssessmentRetryTest extends CoreDataApiTestCase
{
    public function test_retries_replace_answers_repeatedly_for_pre_post_and_tasks_without_changing_questions(): void
    {
        Storage::fake('local');
        $admin = auth()->user();
        foreach (['pre', 'post', 'tasks'] as $type) {
            [$student, $user, $courseId, $questionId, $submissionId] = $this->fixture($type);
            $path = 'assessment-attachments/'.$submissionId.'.pdf';
            Storage::disk('local')->put($path, 'old answer');
            DB::table('course_submission_answers')->where('submission_id', $submissionId)->update(['file_path' => $path]);
            // An authored resource is never removed with a student's answer.
            DB::table('course_questions')->where('id', $questionId)->update(['attachment_path' => 'resource.pdf']);
            Storage::disk('local')->put('resource.pdf', 'resource');

            for ($attempt = 0; $attempt < 2; $attempt++) {
                Sanctum::actingAs($admin);
                $this->postJson('/api/dashboard/assessment-submissions/'.$submissionId.'/reset')->assertNoContent();
                $this->assertDatabaseMissing('course_submissions', ['id' => $submissionId]);
                $this->assertDatabaseMissing('course_submission_answers', ['submission_id' => $submissionId]);
                $this->assertDatabaseHas('assessment_retries', ['student_id' => $student->id, 'assessment_type' => $type]);
                Storage::disk('local')->assertMissing($path);
                Storage::disk('local')->assertExists('resource.pdf');
                $this->assertDatabaseHas('course_questions', ['id' => $questionId, 'attachment_path' => 'resource.pdf']);
                $this->assertDatabaseHas('courses', ['id' => $courseId, 'task_template_content' => '<p>Original template</p>']);

                Sanctum::actingAs($user);
                $snapshot = $this->getJson('/api/public/snapshot')->assertOk();
                $course = collect($snapshot->json('courses'))->firstWhere('id', $courseId);
                $this->assertSame([$type], $course['retryTypes']);
                $this->assertEmpty(collect($snapshot->json('submissions'))->where('courseId', $courseId));
                $response = $this->postJson('/api/public/assessment-submissions', $this->payload($student, $courseId, $questionId, $type))
                    ->assertCreated();
                $submissionId = $response->json('id');
                $this->assertDatabaseMissing('assessment_retries', ['student_id' => $student->id, 'course_id' => $courseId]);
                $this->assertDatabaseHas('course_submissions', ['id' => $submissionId, 'manual_score' => null,
                    'task_review_status' => $type === 'tasks' ? 'pending' : null]);
                $this->postJson('/api/public/assessment-submissions', $this->payload($student, $courseId, $questionId, $type))
                    ->assertUnprocessable();
            }
        }
    }

    public function test_only_authorized_managers_in_the_same_branch_can_reset(): void
    {
        $admin = auth()->user();
        [$student, $user, , , $submissionId] = $this->fixture('pre');
        Sanctum::actingAs($user);
        $this->postJson('/api/dashboard/assessment-submissions/'.$submissionId.'/reset')->assertForbidden();
        Sanctum::actingAs(User::factory()->create(['role' => 'female_manager']));
        $this->postJson('/api/dashboard/assessment-submissions/'.$submissionId.'/reset')->assertForbidden();
        $this->assertDatabaseHas('course_submissions', ['id' => $submissionId]);
        Sanctum::actingAs(User::factory()->create(['role' => 'male_manager']));
        $this->postJson('/api/dashboard/assessment-submissions/'.$submissionId.'/reset')->assertNoContent();
        $this->postJson('/api/dashboard/assessment-submissions/'.$submissionId.'/reset')->assertForbidden();
        Sanctum::actingAs($admin);
        $this->postJson('/api/dashboard/assessment-submissions/missing/reset')->assertNotFound();
    }

    public function test_closed_completion_results_block_reset_without_deleting_the_original(): void
    {
        [, , , , $submissionId] = $this->fixture('tasks');
        DB::table('completion_requirement_settings')->updateOrInsert(['branch_code' => 'male'], ['is_closed' => true]);
        $this->postJson('/api/dashboard/assessment-submissions/'.$submissionId.'/reset')->assertUnprocessable();
        $this->assertDatabaseHas('course_submissions', ['id' => $submissionId, 'task_review_status' => 'approved']);
        $this->assertDatabaseCount('assessment_retries', 0);
    }

    public function test_retry_is_not_available_to_other_students_or_other_assessment_types(): void
    {
        [$student, $user, $courseId, $questionId, $submissionId] = $this->fixture('pre');
        $this->postJson('/api/dashboard/assessment-submissions/'.$submissionId.'/reset')->assertNoContent();
        $other = Student::query()->create(['full_name' => 'Other', 'login_code' => 'other', 'branch_id' => $student->branch_id, 'note' => '']);
        Sanctum::actingAs(User::factory()->create(['role' => 'student', 'login_code' => 'other']));
        $this->postJson('/api/public/assessment-submissions', $this->payload($other, $courseId, $questionId, 'pre'))->assertUnprocessable();
        $snapshot = $this->getJson('/api/public/snapshot')->assertOk();
        $this->assertSame([], collect($snapshot->json('courses'))->firstWhere('id', $courseId)['retryTypes']);
        $this->postJson('/api/public/assessment-submissions', $this->payload($student, $courseId, $questionId, 'pre'))->assertUnprocessable();
        Sanctum::actingAs($user);
        $this->postJson('/api/public/assessment-submissions', $this->payload($student, $courseId, $questionId, 'post'))->assertUnprocessable();
        $this->assertDatabaseCount('assessment_retries', 1);
    }

    public function test_reset_removes_the_separate_manual_score_and_protects_archived_answers(): void
    {
        [$student, , $courseId, , $submissionId] = $this->fixture('pre');
        $settingId = (string) str()->uuid();
        DB::table('course_score_settings')->insert(['id' => $settingId, 'course_id' => $courseId,
            'assessment_type' => 'pre', 'branch_code' => 'male', 'total_points' => 10]);
        DB::table('course_manual_scores')->insert(['id' => (string) str()->uuid(), 'student_id' => $student->id,
            'setting_id' => $settingId, 'score' => 8, 'version' => (string) str()->uuid()]);
        $archiveId = (string) str()->uuid();
        DB::table('archives')->insert(['id' => $archiveId, 'name' => 'Previous batch']);
        DB::table('course_submissions')->where('id', $submissionId)->update(['archive_id' => $archiveId]);
        $this->postJson('/api/dashboard/assessment-submissions/'.$submissionId.'/reset')->assertNotFound();
        $this->assertDatabaseHas('course_submissions', ['id' => $submissionId]);
        DB::table('course_submissions')->where('id', $submissionId)->update(['archive_id' => null]);
        $this->postJson('/api/dashboard/assessment-submissions/'.$submissionId.'/reset')->assertNoContent();
        $this->assertDatabaseMissing('course_manual_scores', ['student_id' => $student->id, 'setting_id' => $settingId]);
    }

    public function test_retry_grants_are_scoped_to_the_department(): void
    {
        [$student, , , , $submissionId] = $this->fixture('pre');
        $department = app(DepartmentManagementService::class)->save([
            'name' => 'Other department', 'managerTitle' => 'Manager',
            'managerLoginCode' => '88123470', 'managerPassword' => '12345678',
        ]);
        Sanctum::actingAs(User::query()->findOrFail($department['manager']['id']));
        $this->postJson('/api/dashboard/assessment-submissions/'.$submissionId.'/reset')->assertNotFound();
        $this->assertDatabaseHas('course_submissions', ['id' => $submissionId]);
        $this->assertDatabaseCount('assessment_retries', 0);
    }

    private function fixture(string $type): array
    {
        $student = Student::query()->create(['full_name' => 'Retry Student', 'login_code' => 'retry-'.$type,
            'branch_id' => DB::table('branches')->where('code', 'male')->value('id'), 'note' => '']);
        $user = User::factory()->create(['role' => 'student', 'login_code' => $student->login_code]);
        $courseId = (string) str()->uuid();
        $questionId = (string) str()->uuid();
        $submissionId = (string) str()->uuid();
        DB::table('courses')->insert(['id' => $courseId, 'title' => 'Retry course', 'created_at' => now(),
            'is_pre_enabled' => false, 'is_post_enabled' => false, 'is_tasks_enabled' => false,
            'task_template_content' => '<p>Original template</p>']);
        DB::table('course_questions')->insert(['id' => $questionId, 'course_id' => $courseId, 'assessment_type' => $type,
            'question_type' => 'text', 'prompt' => 'Original question', 'options' => '[]', 'allow_file' => true,
            'points' => 1, 'correct_answer' => '', 'sort_order' => 0, 'created_at' => now()]);
        DB::table('course_submissions')->insert(['id' => $submissionId, 'course_id' => $courseId, 'assessment_type' => $type,
            'student_id' => $student->id, 'student_name' => $student->full_name, 'login_code' => $student->login_code,
            'manual_score' => $type === 'tasks' ? null : 1, 'task_review_status' => $type === 'tasks' ? 'approved' : null,
            'submitted_at' => now()]);
        DB::table('course_submission_answers')->insert(['id' => (string) str()->uuid(), 'submission_id' => $submissionId,
            'question_id' => $questionId, 'answer_text' => 'Old answer', 'created_at' => now()]);

        return [$student, $user, $courseId, $questionId, $submissionId];
    }

    private function payload(Student $student, string $courseId, string $questionId, string $type): array
    {
        return ['courseId' => $courseId, 'assessmentType' => $type, 'studentName' => $student->full_name,
            'loginId' => $student->login_code, 'answers' => [['questionId' => $questionId, 'value' => 'New answer']]];
    }
}
