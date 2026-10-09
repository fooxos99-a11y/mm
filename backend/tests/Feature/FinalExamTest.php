<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

class FinalExamTest extends CoreDataApiTestCase
{
    public function test_public_final_exam_submission_flow_works(): void
    {
        $questionId = (string) Str::uuid();

        $user = User::factory()->create([
            'full_name' => 'Trusted Final Exam Student',
            'role' => 'student',
            'login_code' => '6700',
        ]);
        Student::query()->create([
            'full_name' => $user->full_name,
            'login_code' => $user->login_code,
            'branch_id' => DB::table('branches')->where('code', 'male')->value('id'),
            'note' => '',
        ]);
        Sanctum::actingAs($user);

        DB::table('final_exam_questions')->insert([
            'id' => $questionId,
            'branch_code' => 'male',
            'question_type' => 'multiple',
            'prompt' => 'سؤال نهائي عام',
            'options' => json_encode(['صح', 'خطأ'], JSON_UNESCAPED_UNICODE),
            'allow_file' => false,
            'points' => 3,
            'correct_answer' => 'صح',
            'attachment_name' => '',
            'attachment_type' => '',
            'attachment_data_url' => '',
            'sort_order' => 0,
            'created_at' => now(),
        ]);

        DB::table('final_exam_settings')->updateOrInsert(
            ['branch_code' => 'male'],
            [
                'is_enabled' => true,
                'closes_at' => now()->addMinutes(45),
                'notification_template' => '',
            ],
        );

        $response = $this->postJson('/api/public/final-exam/submissions', [
            'branchCode' => 'male',
            'studentName' => 'طالب النهائي العام',
            'loginCode' => '6700',
            'answers' => [[
                'questionId' => $questionId,
                'value' => 'صح',
            ]],
        ])->assertCreated();

        $submissionId = $response->json('id');

        $this->assertDatabaseHas('final_exam_submissions', [
            'id' => $submissionId,
            'branch_code' => 'male',
            'login_code' => '6700',
        ]);

        $this->assertDatabaseHas('final_exam_submission_answers', [
            'submission_id' => $submissionId,
            'question_id' => $questionId,
            'answer_text' => 'صح',
        ]);
    }

    public function test_final_exam_management_and_submission_flows_work(): void
    {
        $questionResponse = $this->postJson('/api/dashboard/final-exam/questions', [
            'branchCode' => 'male',
            'prompt' => 'سؤال نهائي',
            'type' => 'truefalse',
            'options' => [],
            'allowFile' => false,
            'points' => 3,
            'correctAnswer' => 'صح',
        ])->assertCreated();

        $questionId = $questionResponse->json('id');

        $textQuestionResponse = $this->postJson('/api/dashboard/final-exam/questions', [
            'branchCode' => 'male',
            'prompt' => 'اشرح إجابتك',
            'type' => 'text',
            'options' => [],
            'allowFile' => false,
            'points' => 4,
            'correctAnswer' => '',
        ])->assertCreated();

        $textQuestionId = $textQuestionResponse->json('id');

        $this->putJson('/api/dashboard/final-exam/settings/male', [
            'isEnabled' => true,
            'closesAt' => now()->addMinutes(45)->toISOString(),
        ])->assertNoContent();

        $this->putJson('/api/dashboard/final-exam/settings/male/notification-template', [
            'notificationTemplate' => 'تم فتح الاختبار النهائي',
        ])->assertNoContent();

        $submissionResponse = $this->postJson('/api/dashboard/final-exam/submissions', [
            'branchCode' => 'male',
            'studentName' => 'طالب نهائي',
            'loginCode' => '9900',
            'answers' => [[
                'questionId' => $questionId,
                'value' => 'صح',
            ], [
                'questionId' => $textQuestionId,
                'value' => 'إجابة تفسيرية',
            ]],
        ])->assertCreated();

        $submissionId = $submissionResponse->json('id');
        $textAnswerId = DB::table('final_exam_submission_answers')
            ->where('submission_id', $submissionId)
            ->where('question_id', $textQuestionId)
            ->value('id');

        $manualScoreUrl = '/api/dashboard/final-exam/submissions/'.$submissionId
            .'/answers/'.$textAnswerId.'/manual-score';

        $this->putJson($manualScoreUrl, [
            'score' => 5,
        ])->assertUnprocessable()
            ->assertJsonPath('errors.score.0', 'الحد الأعلى لدرجة هذه الإجابة هو 4.');

        $this->putJson($manualScoreUrl, [
            'score' => 3.5,
        ])->assertNoContent();

        $this->assertDatabaseHas('final_exam_submission_answers', [
            'id' => $textAnswerId,
            'manual_points' => 3.5,
        ]);

        $this->putJson('/api/dashboard/final-exam/submissions/'.$submissionId.'/manual-score', [
            'score' => 9,
        ])->assertNoContent();

        $this->postJson('/api/dashboard/final-exam/questions/copy', [
            'from' => 'male',
            'to' => 'female',
            'move' => false,
        ])->assertNoContent();

        $snapshot = $this->getJson('/api/dashboard/snapshot')->assertOk();

        $snapshot
            ->assertJsonFragment(['id' => $questionId])
            ->assertJsonPath('finalExamSubmissions.0.id', $submissionId)
            ->assertJsonPath('finalExamSubmissions.0.manualScore', 9)
            ->assertJsonPath('finalExamSettings.male.isEnabled', true)
            ->assertJsonPath('finalExamSettings.male.notificationTemplate', 'تم فتح الاختبار النهائي');

        $this->putJson('/api/dashboard/final-exam/settings/male', [
            'isEnabled' => true,
            'closesAt' => now()->subMinute()->toISOString(),
        ])->assertNoContent();

        $this->postJson('/api/dashboard/final-exam/submissions', [
            'branchCode' => 'male',
            'studentName' => 'طالب نهائي متأخر',
            'loginCode' => '9901',
            'answers' => [[
                'questionId' => $questionId,
                'value' => 'صح',
            ]],
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.branchCode.0', 'انتهى وقت الإرسال أو أن الاختبار النهائي غير متاح حاليًا.');

        $this->assertDatabaseHas('final_exam_questions', ['branch_code' => 'female']);

        $this->deleteJson('/api/dashboard/final-exam/questions/'.$questionId)->assertNoContent();
        $this->assertNotNull(DB::table('final_exam_questions')->where('id', $questionId)->value('deleted_at'));

        $this->assertDatabaseHas('final_exam_questions', ['id' => $questionId]);
    }
}
