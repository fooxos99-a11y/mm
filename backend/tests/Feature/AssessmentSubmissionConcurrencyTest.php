<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Services\CourseAssessmentService;
use App\Services\CourseManagementService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\DataProvider;

class AssessmentSubmissionConcurrencyTest extends CoreDataApiTestCase
{
    public static function assessmentTypes(): array
    {
        return [['pre'], ['post'], ['tasks']];
    }

    #[DataProvider('assessmentTypes')]
    public function test_competing_submission_is_rejected_without_overwriting_the_winner(string $type): void
    {
        $payload = $this->submission($type);
        $winner = null;
        $interleaved = false;
        DB::listen(function ($query) use ($payload, $type, &$winner, &$interleaved): void {
            if ($interleaved || ! str_starts_with($query->sql, 'select exists')
                || ! str_contains($query->sql, 'course_submissions')) {
                return;
            }

            // The existence query already returned empty; another request finishes before our insert.
            $interleaved = true;
            $winningPayload = $payload;
            $winningPayload['answers'][0]['value'] = 'winning answer';
            $winner = app(CourseAssessmentService::class)->submitAssessment($payload['courseId'], $type, $winningPayload);
        });

        $this->postJson('/api/dashboard/assessment-submissions', $payload)
            ->assertUnprocessable()
            ->assertJsonPath('errors.loginId.0', 'تم إرسال هذا الاختبار مسبقًا، ولا يمكن إعادة الاختبار مرة أخرى.');

        $this->assertTrue($interleaved);
        $this->assertDatabaseCount('course_submissions', 1);
        $this->assertDatabaseCount('course_submission_answers', 1);
        $this->assertDatabaseHas('course_submission_answers', [
            'submission_id' => $winner['id'], 'answer_text' => 'winning answer',
        ]);
        $this->assertDatabaseCount('notifications', $type === 'tasks' ? 1 : 0);
    }

    #[DataProvider('assessmentTypes')]
    public function test_answer_failure_rolls_back_the_submission_and_allows_a_complete_retry(string $type): void
    {
        $payload = $this->submission($type);
        $questionId = app(CourseManagementService::class)->addCourseQuestion($payload['courseId'], $type, [
            'prompt' => 'Attachment question', 'type' => 'text', 'options' => [],
            'correctAnswer' => '', 'points' => 1, 'allowFile' => true,
        ]);
        $payload['answers'][] = ['questionId' => $questionId, 'value' => '',
            'fileType' => 'text/plain', 'fileDataUrl' => 'data:text/plain;base64,%%%'];

        try {
            app(CourseAssessmentService::class)->submitAssessment($payload['courseId'], $type, $payload);
            $this->fail('An invalid attachment must fail the entire submission.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('answers', $exception->errors());
        }

        $this->assertDatabaseCount('course_submissions', 0);
        $this->assertDatabaseCount('course_submission_answers', 0);
        $this->assertDatabaseCount('notifications', 0);
        $payload['answers'][1] = ['questionId' => $questionId, 'value' => 'complete retry'];
        $this->postJson('/api/dashboard/assessment-submissions', $payload)->assertCreated();
        $this->assertDatabaseCount('course_submissions', 1);
        $this->assertDatabaseCount('course_submission_answers', 2);
    }

    private function submission(string $type): array
    {
        Student::query()->create([
            'full_name' => 'Concurrent student', 'login_code' => 'race-100',
            'branch_id' => DB::table('branches')->where('code', 'male')->value('id'),
        ]);
        $manager = app(CourseManagementService::class);
        $course = $manager->createCourse('Concurrent assessment', false);
        DB::table('courses')->where('id', $course['id'])->update(['is_tasks_enabled' => true]);
        $questionId = $manager->addCourseQuestion($course['id'], $type, [
            'prompt' => 'Concurrent question', 'type' => 'text', 'options' => [],
            'correctAnswer' => '', 'points' => 1, 'allowFile' => true,
        ]);

        return ['courseId' => $course['id'], 'assessmentType' => $type,
            'studentName' => 'Concurrent student', 'loginId' => 'race-100',
            'answers' => [['questionId' => $questionId, 'value' => 'losing answer']]];
    }
}
