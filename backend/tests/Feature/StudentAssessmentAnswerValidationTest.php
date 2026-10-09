<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use App\Services\CourseManagementService;
use App\Services\FinalExamService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;

class StudentAssessmentAnswerValidationTest extends CoreDataApiTestCase
{
    public static function invalidAnswers(): array
    {
        $cases = [];
        foreach (['pre', 'post', 'tasks', 'final'] as $type) {
            foreach (['missing', 'blank', 'unknown-choice', 'file-not-allowed'] as $reason) {
                $cases["$type-$reason"] = [$type, $reason];
            }
        }

        return $cases;
    }

    public static function types(): array
    {
        return [['pre'], ['post'], ['tasks'], ['final']];
    }

    #[DataProvider('invalidAnswers')]
    public function test_student_cannot_finalize_invalid_or_incomplete_answers(string $type, string $reason): void
    {
        [$endpoint, $payload] = $this->submission($type);
        if ($reason === 'missing') {
            array_pop($payload['answers']);
        } elseif ($reason === 'blank') {
            $payload['answers'][1]['value'] = '   ';
        } elseif ($reason === 'unknown-choice') {
            $payload['answers'][0]['value'] = 'not a saved option';
        } else {
            $payload['answers'][0]['file'] = UploadedFile::fake()->image('unexpected.png');
        }
        $this->post($endpoint, $payload, ['Accept' => 'application/json'])->assertUnprocessable();
        $this->assertDatabaseCount($type === 'final' ? 'final_exam_submissions' : 'course_submissions', 0);
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    #[DataProvider('types')]
    public function test_complete_student_submission_can_use_an_allowed_file_only_answer(string $type): void
    {
        [$endpoint, $payload] = $this->submission($type);
        $payload['answers'][1]['value'] = '';
        $payload['answers'][1]['file'] = UploadedFile::fake()->createWithContent('answer.pdf', "%PDF-1.4\n%%EOF");
        $this->post($endpoint, $payload, ['Accept' => 'application/json'])->assertCreated();
        $this->assertDatabaseCount($type === 'final' ? 'final_exam_submission_answers' : 'course_submission_answers', 2);
        $this->assertCount(1, Storage::disk('local')->allFiles());
    }

    private function submission(string $type): array
    {
        Storage::fake('local');
        $definitions = [
            ['prompt' => 'Saved choices', 'type' => 'multiple', 'options' => ['A', 'B'], 'correctAnswer' => 'A', 'points' => 1, 'allowFile' => false],
            ['prompt' => 'Allowed attachment', 'type' => 'text', 'options' => [], 'correctAnswer' => '', 'points' => 1, 'allowFile' => true],
        ];
        $payload = ['studentName' => 'Student', 'answers' => []];
        if ($type === 'final') {
            $service = app(FinalExamService::class);
            foreach ($definitions as $definition) {
                $question = $service->addFinalExamQuestion('male', $definition);
                $payload['answers'][] = ['questionId' => $question['id'], 'value' => 'A'];
            }
            $service->updateFinalExamSetting('male', true, now()->addHour()->toISOString());
            $payload += ['branchCode' => 'male', 'loginCode' => 'student-validation'];
            $endpoint = '/api/public/final-exam/submissions';
        } else {
            $service = app(CourseManagementService::class);
            $course = $service->createCourse('Student validation', true);
            DB::table('courses')->where('id', $course['id'])->update(['is_tasks_enabled' => true]);
            foreach ($definitions as $definition) {
                $payload['answers'][] = ['questionId' => $service->addCourseQuestion($course['id'], $type, $definition), 'value' => 'A'];
            }
            $payload += ['courseId' => $course['id'], 'assessmentType' => $type, 'loginId' => 'student-validation'];
            $endpoint = '/api/public/assessment-submissions';
        }
        $user = User::factory()->create(['full_name' => 'Student', 'login_code' => 'student-validation', 'role' => 'student']);
        Student::query()->create(['full_name' => 'Student', 'login_code' => $user->login_code,
            'branch_id' => DB::table('branches')->where('code', 'male')->value('id')]);
        Sanctum::actingAs($user);

        return [$endpoint, $payload];
    }
}
