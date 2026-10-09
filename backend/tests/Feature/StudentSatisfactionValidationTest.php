<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use App\Services\CourseAssessmentService;
use App\Services\CourseManagementService;
use App\Services\SatisfactionService;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;

class StudentSatisfactionValidationTest extends CoreDataApiTestCase
{
    public static function invalidResponses(): array
    {
        return array_map(fn ($reason) => [$reason], ['missing', 'blank-text', 'blank-rating', 'rating-zero', 'rating-eleven', 'duplicate', 'before-post', 'rating-for-text', 'text-for-rating']);
    }

    #[DataProvider('invalidResponses')]
    public function test_student_cannot_save_an_incomplete_or_invalid_survey(string $reason): void
    {
        $responses = $this->responses($reason !== 'before-post');
        if ($reason === 'missing') {
            array_splice($responses, 1, 1);
        }
        if ($reason === 'blank-text') {
            $responses[1]['textValue'] = '   ';
        }
        if ($reason === 'blank-rating') {
            $responses[0]['ratingValue'] = null;
        }
        if ($reason === 'rating-zero') {
            $responses[0]['ratingValue'] = 0;
        }
        if ($reason === 'rating-eleven') {
            $responses[0]['ratingValue'] = 11;
        }
        if ($reason === 'duplicate') {
            $responses[] = $responses[0];
        }
        if ($reason === 'rating-for-text') {
            $responses[1]['ratingValue'] = 5;
        }
        if ($reason === 'text-for-rating') {
            $responses[0]['textValue'] = 'Wrong answer type';
        }
        $this->postJson('/api/public/satisfaction-responses', ['responses' => $responses])->assertUnprocessable();
        $this->assertDatabaseCount('satisfaction_responses', 0);
    }

    public function test_student_can_save_minimum_rating_with_an_unanswered_optional_question(): void
    {
        $responses = $this->responses();
        $this->postJson('/api/public/satisfaction-responses', ['responses' => $responses])->assertOk();
        $this->assertDatabaseHas('satisfaction_responses', ['question_id' => $responses[0]['questionId'], 'rating_value' => 1]);
        $this->assertDatabaseCount('satisfaction_responses', 3);
    }

    public function test_invalid_retry_preserves_previously_accepted_responses(): void
    {
        $responses = $this->responses();
        $this->postJson('/api/public/satisfaction-responses', ['responses' => $responses])->assertOk();
        $responses[0]['ratingValue'] = 11;
        $this->postJson('/api/public/satisfaction-responses', ['responses' => $responses])->assertUnprocessable();
        $this->assertDatabaseHas('satisfaction_responses', ['question_id' => $responses[0]['questionId'], 'rating_value' => 1]);
        $this->assertDatabaseCount('satisfaction_responses', 3);
    }

    private function responses(bool $postSubmitted = true): array
    {
        $manager = app(CourseManagementService::class);
        $course = $manager->createCourse('Student survey validation', true);
        $question = $manager->addCourseQuestion($course['id'], 'post', [
            'prompt' => 'Post answer', 'type' => 'text', 'options' => [], 'correctAnswer' => '', 'points' => 1, 'allowFile' => false,
        ]);
        $user = User::factory()->create(['role' => 'student', 'login_code' => 'survey-validation']);
        Student::query()->create(['full_name' => 'Student', 'login_code' => $user->login_code,
            'branch_id' => DB::table('branches')->where('code', 'male')->value('id')]);
        if ($postSubmitted) {
            app(CourseAssessmentService::class)->submitAssessment($course['id'], 'post', [
                'studentName' => 'Student', 'loginId' => $user->login_code, 'answers' => [['questionId' => $question, 'value' => 'Complete']],
            ]);
        }
        $service = app(SatisfactionService::class);
        $responses = [];
        foreach ([['rating', true], ['text', true], ['text', false]] as [$type, $required]) {
            $created = $service->addSatisfactionQuestion('Survey '.$type.' '.count($responses), $type, $required, 'course', $course['id']);
            $responses[] = ['courseId' => $course['id'], 'questionId' => $created[0]['id'],
                'loginCode' => $user->login_code, 'studentName' => 'Student',
                'ratingValue' => $type === 'rating' ? 1 : null, 'textValue' => $type === 'text' && $required ? 'Complete' : ''];
        }
        Sanctum::actingAs($user);

        return $responses;
    }
}
