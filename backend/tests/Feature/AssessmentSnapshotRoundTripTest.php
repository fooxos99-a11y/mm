<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use App\Services\CompletionRequirementsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AssessmentSnapshotRoundTripTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(User::factory()->create([
            'role' => 'admin',
            'login_code' => 'snapshot-admin',
        ]));
    }

    public function test_dashboard_snapshot_exposes_flat_question_snapshots_and_hides_answer_keys_without_permission(): void
    {
        $this->seedAssessmentHistory();

        $adminSnapshot = $this->getJson('/api/dashboard/snapshot')->assertOk();
        $courseAnswer = $adminSnapshot->json('submissions.0.answers.0');
        $finalAnswer = $adminSnapshot->json('finalExamSubmissions.0.answers.0');

        $this->assertSame('Historic course prompt', $courseAnswer['prompt']);
        $this->assertSame('multiple', $courseAnswer['type']);
        $this->assertSame(['Old A', 'Old B'], $courseAnswer['options']);
        $this->assertSame('Old A', $courseAnswer['correctAnswer']);
        $this->assertSame(4, $courseAnswer['points']);
        $this->assertTrue($courseAnswer['allowFile']);
        $this->assertSame('Historic final prompt', $finalAnswer['prompt']);
        $this->assertSame('Historic correct', $finalAnswer['correctAnswer']);
        $this->assertSame(6, $finalAnswer['points']);

        DB::table('role_permissions')->where('role', 'male_manager')->delete();
        DB::table('role_permissions')->insert([
            'role' => 'male_manager',
            'permission_key' => 'page_results',
            'is_enabled' => true,
        ]);
        Sanctum::actingAs(User::factory()->create([
            'role' => 'male_manager',
            'login_code' => 'snapshot-manager',
        ]));

        $managerSnapshot = $this->getJson('/api/dashboard/snapshot')->assertOk();

        $this->assertSame('', $managerSnapshot->json('submissions.0.answers.0.correctAnswer'));
        $this->assertSame('', $managerSnapshot->json('finalExamSubmissions.0.answers.0.correctAnswer'));
        $this->assertSame('Historic course prompt', $managerSnapshot->json('submissions.0.answers.0.prompt'));
        $this->assertSame(6, $managerSnapshot->json('finalExamSubmissions.0.answers.0.points'));
    }

    public function test_completion_final_exam_calculation_uses_snapshots_with_current_question_fallback(): void
    {
        $branchId = DB::table('branches')->where('code', 'male')->value('id');
        $historicStudent = Student::query()->create([
            'full_name' => 'Historic Score Student',
            'login_code' => 'score-historic',
            'branch_id' => $branchId,
            'note' => '',
        ]);
        $fallbackStudent = Student::query()->create([
            'full_name' => 'Fallback Score Student',
            'login_code' => 'score-fallback',
            'branch_id' => $branchId,
            'note' => '',
        ]);
        $questionId = $this->insertFinalQuestion();

        $historicSubmissionId = $this->insertFinalSubmission($historicStudent->login_code);
        DB::table('final_exam_submission_answers')->insert([
            'id' => (string) Str::uuid(),
            'submission_id' => $historicSubmissionId,
            'question_id' => $questionId,
            'answer_text' => 'Historic correct',
            'correct_answer_snapshot' => 'Historic correct',
            'question_points_snapshot' => 4,
        ]);

        $fallbackSubmissionId = $this->insertFinalSubmission($fallbackStudent->login_code);
        DB::table('final_exam_submission_answers')->insert([
            'id' => (string) Str::uuid(),
            'submission_id' => $fallbackSubmissionId,
            'question_id' => $questionId,
            'answer_text' => 'Current correct',
            'correct_answer_snapshot' => null,
            'question_points_snapshot' => null,
        ]);

        $rows = collect(app(CompletionRequirementsService::class)->branchPayload('male')['students'])
            ->keyBy('loginCode');

        $this->assertSame(4.0, $rows['score-historic']['details']['finalExam']['score']);
        $this->assertSame(4.0, $rows['score-historic']['details']['finalExam']['total']);
        $this->assertSame(100.0, $rows['score-historic']['details']['finalExam']['percentage']);
        $this->assertSame(20.0, $rows['score-fallback']['details']['finalExam']['score']);
        $this->assertSame(20.0, $rows['score-fallback']['details']['finalExam']['total']);
        $this->assertSame(100.0, $rows['score-fallback']['details']['finalExam']['percentage']);
    }

    /**
     * @return array{courseQuestionId: string, finalQuestionId: string}
     */
    private function seedAssessmentHistory(): array
    {
        $branchId = DB::table('branches')->where('code', 'male')->value('id');
        $student = Student::query()->create([
            'full_name' => 'Snapshot Student',
            'login_code' => 'snapshot-student',
            'branch_id' => $branchId,
            'note' => '',
        ]);
        $courseId = (string) Str::uuid();
        $courseQuestionId = (string) Str::uuid();
        $courseSubmissionId = (string) Str::uuid();

        DB::table('courses')->insert([
            'id' => $courseId,
            'title' => 'Snapshot course',
            'created_at' => now(),
        ]);
        DB::table('course_questions')->insert([
            'id' => $courseQuestionId,
            'course_id' => $courseId,
            'assessment_type' => 'pre',
            'question_type' => 'multiple',
            'prompt' => 'Current course prompt',
            'options' => json_encode(['Current A', 'Current B']),
            'allow_file' => false,
            'points' => 10,
            'correct_answer' => 'Current A',
            'sort_order' => 0,
            'created_at' => now(),
        ]);
        DB::table('course_submissions')->insert([
            'id' => $courseSubmissionId,
            'course_id' => $courseId,
            'assessment_type' => 'pre',
            'student_id' => $student->id,
            'student_name' => $student->full_name,
            'login_code' => $student->login_code,
            'submitted_at' => now(),
        ]);
        DB::table('course_submission_answers')->insert([
            'id' => (string) Str::uuid(),
            'submission_id' => $courseSubmissionId,
            'question_id' => $courseQuestionId,
            'answer_text' => 'Old A',
            'question_prompt_snapshot' => 'Historic course prompt',
            'question_type_snapshot' => 'multiple',
            'question_options_snapshot' => json_encode(['Old A', 'Old B']),
            'correct_answer_snapshot' => 'Old A',
            'question_points_snapshot' => 4,
            'allow_file_snapshot' => true,
            'created_at' => now(),
        ]);

        $finalQuestionId = $this->insertFinalQuestion();
        $finalSubmissionId = $this->insertFinalSubmission($student->login_code);
        DB::table('final_exam_submission_answers')->insert([
            'id' => (string) Str::uuid(),
            'submission_id' => $finalSubmissionId,
            'question_id' => $finalQuestionId,
            'answer_text' => 'Historic correct',
            'question_prompt_snapshot' => 'Historic final prompt',
            'question_type_snapshot' => 'multiple',
            'question_options_snapshot' => json_encode(['Historic 1', 'Historic 2']),
            'correct_answer_snapshot' => 'Historic correct',
            'question_points_snapshot' => 6,
            'allow_file_snapshot' => true,
        ]);

        return compact('courseQuestionId', 'finalQuestionId');
    }

    private function insertFinalQuestion(): string
    {
        $questionId = (string) Str::uuid();
        DB::table('final_exam_questions')->insert([
            'id' => $questionId,
            'branch_code' => 'male',
            'question_type' => 'multiple',
            'prompt' => 'Current final prompt',
            'options' => json_encode(['Current 1', 'Current 2']),
            'allow_file' => false,
            'points' => 20,
            'correct_answer' => 'Current correct',
            'sort_order' => 0,
            'created_at' => now(),
        ]);

        return $questionId;
    }

    private function insertFinalSubmission(string $loginCode): string
    {
        $submissionId = (string) Str::uuid();
        DB::table('final_exam_submissions')->insert([
            'id' => $submissionId,
            'branch_code' => 'male',
            'student_name' => $loginCode,
            'login_code' => $loginCode,
            'submitted_at' => now(),
        ]);

        return $submissionId;
    }
}
