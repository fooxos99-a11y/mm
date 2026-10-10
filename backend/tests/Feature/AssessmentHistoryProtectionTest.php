<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AssessmentHistoryProtectionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(User::factory()->create([
            'role' => 'admin',
            'login_code' => 'history-admin',
        ]));
    }

    public function test_course_submission_validates_question_scope_snapshots_it_and_freezes_historical_content(): void
    {
        [$courseId, $questionId] = $this->createCourseWithQuestion(
            'pre',
            'Original course question',
            ['A', 'B'],
            'A',
            4
        );
        [, $foreignQuestionId] = $this->createCourseWithQuestion('post', 'Foreign question', ['X', 'Y'], 'X', 2);

        $this->postJson('/api/dashboard/assessment-submissions', [
            'courseId' => $courseId,
            'assessmentType' => 'pre',
            'studentName' => 'History Student',
            'loginId' => 'history-course-invalid',
            'answers' => [['questionId' => $foreignQuestionId, 'value' => 'X']],
        ])->assertUnprocessable()->assertJsonValidationErrors(['answers']);

        $submission = $this->postJson('/api/dashboard/assessment-submissions', [
            'courseId' => $courseId,
            'assessmentType' => 'pre',
            'studentName' => 'History Student',
            'loginId' => 'history-course-valid',
            'answers' => [['questionId' => $questionId, 'value' => 'A']],
        ])->assertCreated();

        $this->assertDatabaseHas('course_submission_answers', [
            'submission_id' => $submission->json('id'),
            'question_id' => $questionId,
            'question_prompt_snapshot' => 'Original course question',
            'question_type_snapshot' => 'multiple',
            'question_options_snapshot' => $this->castAsJson(['A', 'B']),
            'correct_answer_snapshot' => 'A',
            'question_points_snapshot' => 4,
            'allow_file_snapshot' => false,
        ]);

        DB::table('course_questions')->where('id', $questionId)->update([
            'prompt' => 'Directly changed question',
            'correct_answer' => 'B',
        ]);

        $this->assertDatabaseHas('course_submission_answers', [
            'submission_id' => $submission->json('id'),
            'question_prompt_snapshot' => 'Original course question',
            'correct_answer_snapshot' => 'A',
        ]);

        try {
            DB::table('course_questions')->where('id', $questionId)->delete();
            $this->fail('A referenced course question was deleted despite historical answers.');
        } catch (QueryException) {
            $this->assertDatabaseHas('course_questions', ['id' => $questionId]);
            $this->assertDatabaseHas('course_submission_answers', [
                'submission_id' => $submission->json('id'),
                'question_id' => $questionId,
            ]);
        }

        $questionPayload = $this->questionPayload('Changed through API', ['A', 'B'], 'B', 4);

        $this->putJson('/api/dashboard/questions/'.$questionId, $questionPayload)
            ->assertUnprocessable();
        $this->deleteJson('/api/dashboard/questions/'.$questionId)
            ->assertNoContent();
        $this->assertNotNull(DB::table('course_questions')->where('id', $questionId)->value('deleted_at'));
        $this->postJson('/api/dashboard/courses/'.$courseId.'/questions', [
            'assessmentType' => 'pre',
            ...$this->questionPayload('New historical question', ['A', 'B'], 'A', 1),
        ])->assertUnprocessable();
        $this->putJson('/api/dashboard/courses/'.$courseId, ['title' => 'Retroactive title'])
            ->assertUnprocessable();
        $this->putJson('/api/dashboard/courses/'.$courseId, ['isActive' => false])
            ->assertNoContent();
        $this->deleteJson('/api/dashboard/courses/'.$courseId)
            ->assertNoContent();

        $this->assertDatabaseMissing('courses', ['id' => $courseId]);
        $this->assertDatabaseMissing('course_questions', ['id' => $questionId]);
        $this->assertDatabaseMissing('course_submissions', ['id' => $submission->json('id')]);
        $this->assertDatabaseMissing('course_submission_answers', ['submission_id' => $submission->json('id')]);
    }

    public function test_bulk_import_validates_question_scope_and_stores_snapshots(): void
    {
        [$courseId, $questionId] = $this->createCourseWithQuestion(
            'post',
            'Imported question',
            ['Yes', 'No'],
            'Yes',
            3
        );
        [, $foreignQuestionId] = $this->createCourseWithQuestion(
            'post',
            'Other course question',
            ['Yes', 'No'],
            'No',
            1
        );

        $this->postJson('/api/dashboard/assessment-import', [
            'courseId' => $courseId,
            'assessmentType' => 'post',
            'submissions' => [[
                'studentName' => 'Imported Student',
                'loginId' => 'import-invalid',
                'answers' => [['questionId' => $foreignQuestionId, 'value' => 'No']],
            ]],
        ])->assertUnprocessable()->assertJsonValidationErrors(['answers']);

        $response = $this->postJson('/api/dashboard/assessment-import', [
            'courseId' => $courseId,
            'assessmentType' => 'post',
            'submissions' => [[
                'studentName' => 'Imported Student',
                'loginId' => 'import-valid',
                'answers' => [['questionId' => $questionId, 'value' => 'Yes']],
            ]],
        ])->assertOk();

        $this->assertDatabaseHas('course_submission_answers', [
            'submission_id' => $response->json('0.id'),
            'question_id' => $questionId,
            'question_prompt_snapshot' => 'Imported question',
            'correct_answer_snapshot' => 'Yes',
            'question_points_snapshot' => 3,
        ]);
    }

    public function test_final_exam_validates_branch_snapshots_answers_and_freezes_question_set(): void
    {
        $maleQuestionId = $this->createFinalQuestion('male', 'Original final question', ['One', 'Two'], 'One', 5);
        $femaleQuestionId = $this->createFinalQuestion('female', 'Female question', ['One', 'Two'], 'Two', 2);
        $this->openFinalExam('male');

        $this->postJson('/api/dashboard/final-exam/submissions', [
            'branchCode' => 'male',
            'studentName' => 'Final Student',
            'loginCode' => 'final-invalid',
            'answers' => [['questionId' => $femaleQuestionId, 'value' => 'Two']],
        ])->assertUnprocessable()->assertJsonValidationErrors(['answers']);

        $submission = $this->postJson('/api/dashboard/final-exam/submissions', [
            'branchCode' => 'male',
            'studentName' => 'Final Student',
            'loginCode' => 'final-valid',
            'answers' => [['questionId' => $maleQuestionId, 'value' => 'One']],
        ])->assertCreated();

        $this->assertDatabaseHas('final_exam_submission_answers', [
            'submission_id' => $submission->json('id'),
            'question_id' => $maleQuestionId,
            'question_prompt_snapshot' => 'Original final question',
            'question_type_snapshot' => 'multiple',
            'question_options_snapshot' => $this->castAsJson(['One', 'Two']),
            'correct_answer_snapshot' => 'One',
            'question_points_snapshot' => 5,
            'allow_file_snapshot' => false,
        ]);

        try {
            DB::table('final_exam_questions')->where('id', $maleQuestionId)->delete();
            $this->fail('A referenced final exam question was deleted despite historical answers.');
        } catch (QueryException) {
            $this->assertDatabaseHas('final_exam_questions', ['id' => $maleQuestionId]);
            $this->assertDatabaseHas('final_exam_submission_answers', [
                'submission_id' => $submission->json('id'),
                'question_id' => $maleQuestionId,
            ]);
        }

        $questionPayload = $this->questionPayload('Changed final question', ['One', 'Two'], 'Two', 5);

        $this->putJson('/api/dashboard/final-exam/questions/'.$maleQuestionId, $questionPayload)
            ->assertUnprocessable();
        $this->deleteJson('/api/dashboard/final-exam/questions/'.$maleQuestionId)
            ->assertNoContent();
        $this->assertNotNull(DB::table('final_exam_questions')->where('id', $maleQuestionId)->value('deleted_at'));
        $this->postJson('/api/dashboard/final-exam/questions', [
            'branchCode' => 'male',
            ...$this->questionPayload('New final question', ['One', 'Two'], 'One', 1),
        ])->assertUnprocessable();
        $this->postJson('/api/dashboard/final-exam/questions/copy', [
            'from' => 'female',
            'to' => 'male',
            'move' => false,
        ])->assertUnprocessable();

        $this->assertDatabaseHas('final_exam_questions', ['id' => $maleQuestionId]);
    }

    public function test_database_rejects_duplicate_answers_for_the_same_submission_and_question(): void
    {
        [$courseId, $questionId] = $this->createCourseWithQuestion('pre', 'Unique course answer', ['A', 'B'], 'A', 1);
        $courseSubmission = $this->postJson('/api/dashboard/assessment-submissions', [
            'courseId' => $courseId,
            'assessmentType' => 'pre',
            'studentName' => 'Unique Student',
            'loginId' => 'unique-course',
            'answers' => [['questionId' => $questionId, 'value' => 'A']],
        ])->assertCreated();

        $this->assertDuplicateAnswerRejected(
            'course_submission_answers',
            $courseSubmission->json('id'),
            $questionId,
            true
        );

        $finalQuestionId = $this->createFinalQuestion('male', 'Unique final answer', ['A', 'B'], 'A', 1);
        $this->openFinalExam('male');
        $finalSubmission = $this->postJson('/api/dashboard/final-exam/submissions', [
            'branchCode' => 'male',
            'studentName' => 'Unique Final Student',
            'loginCode' => 'unique-final',
            'answers' => [['questionId' => $finalQuestionId, 'value' => 'A']],
        ])->assertCreated();

        $this->assertDuplicateAnswerRejected(
            'final_exam_submission_answers',
            $finalSubmission->json('id'),
            $finalQuestionId,
            false
        );
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function createCourseWithQuestion(
        string $assessmentType,
        string $prompt,
        array $options,
        string $correctAnswer,
        int $points,
    ): array {
        $courseId = (string) Str::uuid();
        $questionId = (string) Str::uuid();

        DB::table('courses')->insert([
            'id' => $courseId,
            'title' => 'History course',
            'created_at' => now(),
        ]);
        DB::table('course_questions')->insert([
            'id' => $questionId,
            'course_id' => $courseId,
            'assessment_type' => $assessmentType,
            'question_type' => 'multiple',
            'prompt' => $prompt,
            'options' => json_encode($options),
            'allow_file' => false,
            'points' => $points,
            'correct_answer' => $correctAnswer,
            'sort_order' => 0,
            'created_at' => now(),
        ]);

        return [$courseId, $questionId];
    }

    private function createFinalQuestion(
        string $branchCode,
        string $prompt,
        array $options,
        string $correctAnswer,
        int $points,
    ): string {
        $questionId = (string) Str::uuid();

        DB::table('final_exam_questions')->insert([
            'id' => $questionId,
            'branch_code' => $branchCode,
            'question_type' => 'multiple',
            'prompt' => $prompt,
            'options' => json_encode($options),
            'allow_file' => false,
            'points' => $points,
            'correct_answer' => $correctAnswer,
            'sort_order' => 0,
            'created_at' => now(),
        ]);

        return $questionId;
    }

    private function openFinalExam(string $branchCode): void
    {
        DB::table('final_exam_settings')->updateOrInsert(
            ['branch_code' => $branchCode],
            ['is_enabled' => true, 'closes_at' => now()->addHour()],
        );
    }

    private function questionPayload(string $prompt, array $options, string $correctAnswer, int $points): array
    {
        return [
            'prompt' => $prompt,
            'type' => 'multiple',
            'options' => $options,
            'allowFile' => false,
            'points' => $points,
            'correctAnswer' => $correctAnswer,
        ];
    }

    private function assertDuplicateAnswerRejected(
        string $table,
        string $submissionId,
        string $questionId,
        bool $hasCreatedAt
    ): void {
        $row = [
            'id' => (string) Str::uuid(),
            'submission_id' => $submissionId,
            'question_id' => $questionId,
            'answer_text' => 'duplicate',
        ];

        if ($hasCreatedAt) {
            $row['created_at'] = now();
        }

        try {
            DB::table($table)->insert($row);
            $this->fail('The submission/question unique constraint was not enforced.');
        } catch (QueryException $exception) {
            $this->assertStringContainsString('unique', strtolower($exception->getMessage()));
        }
    }
}
