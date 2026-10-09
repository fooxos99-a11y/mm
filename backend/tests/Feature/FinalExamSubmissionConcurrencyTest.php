<?php

namespace Tests\Feature;

use App\Services\FinalExamService;
use Illuminate\Support\Facades\DB;

class FinalExamSubmissionConcurrencyTest extends CoreDataApiTestCase
{
    public function test_competing_final_submission_returns_validation_and_preserves_the_winner(): void
    {
        $service = app(FinalExamService::class);
        $question = $service->addFinalExamQuestion('male', [
            'prompt' => 'Concurrent final question', 'type' => 'text',
            'options' => [], 'points' => 2, 'correctAnswer' => '', 'allowFile' => false,
        ]);
        $service->updateFinalExamSetting('male', true, now()->addHour()->toISOString());
        $payload = ['branchCode' => 'male', 'studentName' => 'Concurrent final student',
            'loginCode' => 'final-race', 'answers' => [['questionId' => $question['id'], 'value' => 'loser']]];
        $interleaved = false;
        $winner = null;
        DB::listen(function ($query) use ($service, $payload, &$interleaved, &$winner): void {
            if ($interleaved || ! str_starts_with($query->sql, 'select exists')
                || ! str_contains($query->sql, 'final_exam_submissions')) {
                return;
            }
            $interleaved = true;
            $winningPayload = $payload;
            $winningPayload['answers'][0]['value'] = 'winner';
            $winner = $service->submitFinalExam($winningPayload);
        });

        $this->postJson('/api/dashboard/final-exam/submissions', $payload)
            ->assertUnprocessable()->assertJsonPath('errors.loginCode.0', 'تم إرسال الاختبار النهائي مسبقًا.');
        $this->assertTrue($interleaved);
        $this->assertDatabaseCount('final_exam_submissions', 1);
        $this->assertDatabaseCount('final_exam_submission_answers', 1);
        $this->assertDatabaseHas('final_exam_submission_answers', [
            'submission_id' => $winner['id'], 'answer_text' => 'winner',
        ]);
    }
}
