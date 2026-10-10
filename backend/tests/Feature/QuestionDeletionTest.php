<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use App\Services\CourseManagementService;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

class QuestionDeletionTest extends CoreDataApiTestCase
{
    private function course(string $type = 'course'): string
    {
        return app(CourseManagementService::class)->createCourse('Deletion audit', false, ['entityType' => $type])['id'];
    }

    private function question(string $course, string $type): string
    {
        return $this->postJson('/api/dashboard/courses/'.$course.'/questions', [
            'assessmentType' => $type, 'prompt' => 'Historical question', 'type' => 'text',
            'options' => [], 'allowFile' => false, 'points' => 3, 'correctAnswer' => '',
        ])->assertCreated()->json('id');
    }

    public function test_deleting_all_pre_post_and_task_questions_preserves_answers_and_rejects_stale_submissions(): void
    {
        foreach (['pre', 'post', 'tasks'] as $type) {
            $course = $this->course($type === 'tasks' ? 'task' : 'course');
            $answered = $this->question($course, $type);
            $unanswered = $this->question($course, $type);
            Student::query()->create([
                'full_name' => 'History student', 'login_code' => 'history-'.$type,
                'branch_id' => DB::table('branches')->where('code', 'male')->value('id'),
            ]);
            DB::table('courses')->where('id', $course)->update([
                'is_active' => true, 'is_tasks_enabled' => true,
                'assessment_windows' => json_encode(['global' => [$type => ['closesAt' => now()->addHour()->toISOString()]]]),
            ]);
            $submission = $this->postJson('/api/dashboard/assessment-submissions', [
                'courseId' => $course, 'assessmentType' => $type, 'studentName' => 'History student',
                'loginId' => 'history-'.$type, 'answers' => [['questionId' => $answered, 'value' => 'Historical answer']],
            ])->assertCreated()->json('id');

            $payload = ['assessmentType' => $type, 'questions' => [], 'deletedQuestionIds' => [$answered, $unanswered]];
            Sanctum::actingAs(User::factory()->create(['role' => 'student']));
            $this->putJson('/api/dashboard/courses/'.$course.'/questions/sync', $payload)->assertForbidden();
            $this->assertNull(DB::table('course_questions')->where('id', $answered)->value('deleted_at'));
            Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
            $this->putJson('/api/dashboard/courses/'.$course.'/questions/sync', $payload)
                ->assertOk()->assertJsonPath('questions', []);
            $this->assertNotNull(DB::table('course_questions')->where('id', $answered)->value('deleted_at'));
            $this->assertNotNull(DB::table('course_questions')->where('id', $unanswered)->value('deleted_at'));
            $this->assertDatabaseHas('course_submission_answers', [
                'submission_id' => $submission, 'question_id' => $answered, 'answer_text' => 'Historical answer',
                'question_prompt_snapshot' => 'Historical question', 'question_points_snapshot' => 3,
            ]);
            $snapshot = $this->getJson('/api/dashboard/snapshot')->assertOk();
            $field = ['pre' => 'preQuestions', 'post' => 'postQuestions', 'tasks' => 'taskQuestions'][$type];
            $row = collect($snapshot->json('courses'))->firstWhere('id', $course);
            $this->assertSame([], $row[$field]);
            $this->getJson('/api/dashboard/results?branchCode=male&assessmentType='.$type.'&courseId='.$course)
                ->assertOk()->assertJsonCount(2, 'courses.0.'.$field)
                ->assertJsonPath('submissions.0.answers.0.prompt', 'Historical question')
                ->assertJsonPath('submissions.0.answers.0.points', 3);
            $this->postJson('/api/dashboard/assessment-submissions', [
                'courseId' => $course, 'assessmentType' => $type, 'studentName' => 'Stale student',
                'loginId' => 'stale-'.$type, 'answers' => [['questionId' => $answered, 'value' => 'Late answer']],
            ])->assertUnprocessable();
        }
    }

    public function test_global_satisfaction_deletion_removes_every_copy_and_future_inheritance_but_preserves_history(): void
    {
        $first = $this->course();
        $second = $this->course();
        $payload = ['prompt' => 'Shared rating', 'type' => 'rating', 'isRequired' => true, 'targetScope' => 'all'];
        $this->postJson('/api/dashboard/satisfaction-questions', $payload)->assertCreated();
        $question = DB::table('satisfaction_questions')->where('course_id', $first)->first();
        $otherId = DB::table('satisfaction_questions')->where('course_id', $second)->value('id');
        $responseId = (string) str()->uuid();
        DB::table('satisfaction_responses')->insert([
            'id' => $responseId, 'course_id' => $first, 'question_id' => $question->id,
            'login_code' => 'history-rating', 'student_name' => 'History', 'rating_value' => 8, 'submitted_at' => now(),
        ]);
        $this->deleteJson('/api/dashboard/satisfaction-questions/'.$question->id)->assertNoContent();
        $this->deleteJson('/api/dashboard/satisfaction-questions/'.$otherId)->assertNoContent();
        $this->assertDatabaseMissing('satisfaction_templates', ['id' => $question->global_template_id]);
        $this->assertDatabaseMissing('satisfaction_questions', ['id' => $otherId]);
        $this->assertNotNull(DB::table('satisfaction_questions')->where('id', $question->id)->value('deleted_at'));
        $this->assertDatabaseHas('satisfaction_responses', ['id' => $responseId, 'rating_value' => 8]);
        $this->getJson('/api/dashboard/snapshot')->assertOk()->assertJsonCount(0, 'satisfactionQuestions');
        $future = $this->course();
        $this->assertDatabaseMissing('satisfaction_questions', ['course_id' => $future]);
        $this->postJson('/api/dashboard/satisfaction-responses', ['responses' => [[
            'courseId' => $first, 'questionId' => $question->id, 'loginCode' => 'late',
            'studentName' => 'Late', 'ratingValue' => 5,
        ]]])->assertUnprocessable();
        $this->postJson('/api/dashboard/satisfaction-questions', $payload)->assertCreated();
        $this->assertSame(3, DB::table('satisfaction_questions')->whereNull('deleted_at')->count());
        $this->assertDatabaseHas('satisfaction_responses', ['id' => $responseId]);
    }

    public function test_local_satisfaction_deletion_keeps_same_text_in_another_course_and_rejects_students(): void
    {
        $first = $this->course();
        $second = $this->course();
        $ids = [];
        foreach ([$first, $second] as $course) {
            $ids[] = $this->postJson('/api/dashboard/satisfaction-questions', [
                'prompt' => 'Local', 'type' => 'text', 'isRequired' => false,
                'targetScope' => 'course', 'courseId' => $course,
            ])->assertCreated()->json('0.id');
        }
        Sanctum::actingAs(User::factory()->create(['role' => 'student']));
        $this->deleteJson('/api/dashboard/satisfaction-questions/'.$ids[0])->assertForbidden();
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->deleteJson('/api/dashboard/satisfaction-questions/'.$ids[0])->assertNoContent();
        $this->assertDatabaseMissing('satisfaction_questions', ['id' => $ids[0]]);
        $this->assertDatabaseHas('satisfaction_questions', ['id' => $ids[1]]);
    }
}
