<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

class SatisfactionTest extends CoreDataApiTestCase
{
    public function test_satisfaction_question_and_response_flows_work(): void
    {
        $courseId = (string) str()->uuid();

        DB::table('courses')->insert([
            'id' => $courseId,
            'title' => 'بعد الدورة',
            'entity_type' => 'course',
            'task_mode' => null,
            'task_template_id' => null,
            'task_template_name' => '',
            'task_template_content' => '',
            'youtube_url' => '',
            'is_active' => false,
            'is_pre_enabled' => true,
            'is_post_enabled' => true,
            'is_tasks_enabled' => false,
            'male_pre_enabled' => true,
            'female_pre_enabled' => true,
            'male_post_enabled' => true,
            'female_post_enabled' => true,
            'male_tasks_enabled' => true,
            'female_tasks_enabled' => true,
            'assessment_windows' => json_encode(['global' => [], 'male' => [], 'female' => []]),
            'assessment_notification_templates' => json_encode(['pre' => '', 'post' => '', 'tasks' => '']),
            'sort_order' => 0,
            'created_at' => now(),
        ]);

        $questionResponse = $this->postJson('/api/dashboard/satisfaction-questions', [
            'prompt' => 'كيف كانت الدورة؟',
            'type' => 'rating',
            'isRequired' => true,
        ])->assertCreated();

        $questionId = $questionResponse->json('0.id');

        $this->postJson('/api/dashboard/satisfaction-responses', [
            'responses' => [[
                'courseId' => $courseId,
                'questionId' => $questionId,
                'loginCode' => '8800',
                'studentName' => 'طالب رضا',
                'ratingValue' => 5,
                'textValue' => 'ممتاز',
            ]],
        ])->assertOk()->assertJsonPath('0.questionId', $questionId);

        $this->getJson('/api/dashboard/snapshot')
            ->assertOk()
            ->assertJsonPath('satisfactionQuestions.0.id', $questionId)
            ->assertJsonPath('satisfactionResponses.0.questionId', $questionId)
            ->assertJsonPath('satisfactionResponses.0.ratingValue', 5);

        $this->deleteJson('/api/dashboard/satisfaction-questions/'.$questionId)->assertNoContent();

        $this->assertDatabaseMissing('satisfaction_questions', ['id' => $questionId]);
    }

    public function test_public_student_assessment_submission_flows_work_for_pre_post_and_tasks(): void
    {
        $maleBranchId = DB::table('branches')->where('code', 'male')->value('id');

        Student::query()->create([
            'full_name' => 'طالب المسارات',
            'login_code' => '6500',
            'branch_id' => $maleBranchId,
            'note' => '',
        ]);

        Sanctum::actingAs(User::factory()->create([
            'role' => 'student',
            'login_code' => '6500',
        ]));

        $courseId = (string) Str::uuid();
        $taskCourseId = (string) Str::uuid();
        $preQuestionId = (string) Str::uuid();
        $postQuestionId = (string) Str::uuid();
        $taskQuestionId = (string) Str::uuid();

        DB::table('courses')->insert([
            [
                'id' => $courseId,
                'title' => 'دورة الطالب',
                'entity_type' => 'course',
                'task_mode' => null,
                'task_template_id' => null,
                'task_template_name' => '',
                'task_template_content' => '',
                'youtube_url' => '',
                'is_active' => true,
                'is_pre_enabled' => true,
                'is_post_enabled' => true,
                'is_tasks_enabled' => false,
                'male_pre_enabled' => true,
                'female_pre_enabled' => true,
                'male_post_enabled' => true,
                'female_post_enabled' => true,
                'male_tasks_enabled' => false,
                'female_tasks_enabled' => false,
                'assessment_windows' => json_encode(['global' => [], 'male' => [], 'female' => []]),
                'assessment_notification_templates' => json_encode(['pre' => '', 'post' => '', 'tasks' => '']),
                'sort_order' => 0,
                'created_at' => now(),
            ],
            [
                'id' => $taskCourseId,
                'title' => 'المهمة الأدائية',
                'entity_type' => 'task',
                'task_mode' => 'questions',
                'task_template_id' => null,
                'task_template_name' => '',
                'task_template_content' => '',
                'youtube_url' => '',
                'is_active' => false,
                'is_pre_enabled' => false,
                'is_post_enabled' => false,
                'is_tasks_enabled' => true,
                'male_pre_enabled' => false,
                'female_pre_enabled' => false,
                'male_post_enabled' => false,
                'female_post_enabled' => false,
                'male_tasks_enabled' => true,
                'female_tasks_enabled' => true,
                'assessment_windows' => json_encode(['global' => [], 'male' => [], 'female' => []]),
                'assessment_notification_templates' => json_encode(['pre' => '', 'post' => '', 'tasks' => '']),
                'sort_order' => 1,
                'created_at' => now(),
            ],
        ]);

        DB::table('course_questions')->insert([
            [
                'id' => $preQuestionId,
                'course_id' => $courseId,
                'assessment_type' => 'pre',
                'question_type' => 'text',
                'prompt' => 'سؤال قبلي',
                'options' => json_encode([]),
                'allow_file' => false,
                'points' => 1,
                'correct_answer' => '',
                'attachment_name' => '',
                'attachment_type' => '',
                'attachment_data_url' => '',
                'sort_order' => 0,
                'created_at' => now(),
            ],
            [
                'id' => $postQuestionId,
                'course_id' => $courseId,
                'assessment_type' => 'post',
                'question_type' => 'text',
                'prompt' => 'سؤال بعدي',
                'options' => json_encode([]),
                'allow_file' => false,
                'points' => 2,
                'correct_answer' => '',
                'attachment_name' => '',
                'attachment_type' => '',
                'attachment_data_url' => '',
                'sort_order' => 0,
                'created_at' => now(),
            ],
            [
                'id' => $taskQuestionId,
                'course_id' => $taskCourseId,
                'assessment_type' => 'tasks',
                'question_type' => 'text',
                'prompt' => 'سؤال مهمة',
                'options' => json_encode([]),
                'allow_file' => false,
                'points' => 3,
                'correct_answer' => '',
                'attachment_name' => '',
                'attachment_type' => '',
                'attachment_data_url' => '',
                'sort_order' => 0,
                'created_at' => now(),
            ],
        ]);

        $this->postJson('/api/public/assessment-submissions', [
            'courseId' => $courseId,
            'assessmentType' => 'pre',
            'studentName' => 'طالب المسارات',
            'loginId' => '6500',
            'answers' => [
                ['questionId' => $preQuestionId, 'value' => 'إجابة قبلية'],
            ],
        ])->assertCreated();

        $this->postJson('/api/public/assessment-submissions', [
            'courseId' => $courseId,
            'assessmentType' => 'post',
            'studentName' => 'طالب المسارات',
            'loginId' => '6500',
            'answers' => [
                ['questionId' => $postQuestionId, 'value' => 'إجابة بعدية'],
            ],
        ])->assertCreated();

        $this->postJson('/api/public/assessment-submissions', [
            'courseId' => $taskCourseId,
            'assessmentType' => 'tasks',
            'studentName' => 'طالب المسارات',
            'loginId' => '6500',
            'answers' => [
                ['questionId' => $taskQuestionId, 'value' => 'إجابة المهمة'],
            ],
        ])->assertCreated();

        $this->assertDatabaseHas('course_submissions', [
            'course_id' => $courseId,
            'assessment_type' => 'pre',
            'login_code' => '6500',
        ]);

        $this->assertDatabaseHas('course_submissions', [
            'course_id' => $courseId,
            'assessment_type' => 'post',
            'login_code' => '6500',
        ]);

        $this->assertDatabaseHas('course_submissions', [
            'course_id' => $taskCourseId,
            'assessment_type' => 'tasks',
            'login_code' => '6500',
            'manual_score' => null,
            'task_review_status' => 'pending',
        ]);

        $taskSubmissionId = DB::table('course_submissions')
            ->where('course_id', $taskCourseId)
            ->where('assessment_type', 'tasks')
            ->where('login_code', '6500')
            ->value('id');

        $this->putJson('/api/dashboard/assessment-submissions/'.$taskSubmissionId.'/task-review', [
            'status' => 'approved',
        ])->assertForbidden();

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->putJson('/api/dashboard/assessment-submissions/'.$taskSubmissionId.'/manual-score', [
            'score' => 3,
        ])->assertUnprocessable();

        $this->putJson('/api/dashboard/assessment-submissions/'.$taskSubmissionId.'/task-review', [
            'status' => 'approved',
        ])->assertNoContent();

        $this->assertDatabaseHas('course_submissions', [
            'id' => $taskSubmissionId,
            'manual_score' => null,
            'task_review_status' => 'approved',
        ]);

        $this->getJson('/api/dashboard/snapshot')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $taskSubmissionId,
                'taskReviewStatus' => 'approved',
            ]);

        $this->assertDatabaseHas('course_submission_answers', [
            'question_id' => $preQuestionId,
            'answer_text' => 'إجابة قبلية',
        ]);

        $this->assertDatabaseHas('course_submission_answers', [
            'question_id' => $postQuestionId,
            'answer_text' => 'إجابة بعدية',
        ]);

        $this->assertDatabaseHas('course_submission_answers', [
            'question_id' => $taskQuestionId,
            'answer_text' => 'إجابة المهمة',
        ]);
    }
}
