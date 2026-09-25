<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

class CompletionRequirementsTest extends CoreDataApiTestCase
{
    public function test_student_indicators_endpoint_returns_only_the_authenticated_student(): void
    {
        $maleBranchId = DB::table('branches')->where('code', 'male')->value('id');
        $student = Student::query()->create([
            'full_name' => 'صاحب المؤشرات',
            'login_code' => 'stu-1',
            'branch_id' => $maleBranchId,
            'note' => '',
        ]);
        Student::query()->create([
            'full_name' => 'طالب آخر',
            'login_code' => 'stu-2',
            'branch_id' => $maleBranchId,
            'note' => '',
        ]);
        $user = User::query()->create([
            'full_name' => $student->full_name,
            'role' => 'student',
            'login_code' => $student->login_code,
            'password' => '123',
            'must_change_password' => false,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/students/me/indicators')
            ->assertOk()
            ->assertJsonPath('student.id', $student->id)
            ->assertJsonPath('student.name', 'صاحب المؤشرات')
            ->assertJsonMissing(['name' => 'طالب آخر']);
    }

    public function test_completion_requirements_are_calculated_and_finalized_automatically(): void
    {
        $maleBranchId = DB::table('branches')->where('code', 'male')->value('id');
        $passedStudent = Student::query()->create([
            'full_name' => 'معلم مجتاز',
            'login_code' => '7801',
            'branch_id' => $maleBranchId,
            'note' => '',
        ]);
        Student::query()->create([
            'full_name' => 'معلم قيد الاستكمال',
            'login_code' => '7802',
            'branch_id' => $maleBranchId,
            'note' => '',
        ]);

        $taskId = (string) Str::uuid();
        DB::table('courses')->insert([
            'id' => $taskId,
            'title' => 'مهمة الاجتياز',
            'entity_type' => 'task',
            'task_mode' => 'questions',
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
            'female_tasks_enabled' => false,
            'assessment_windows' => json_encode(['global' => [], 'male' => [], 'female' => []]),
            'assessment_notification_templates' => json_encode(['pre' => '', 'post' => '', 'tasks' => '']),
            'sort_order' => 0,
            'created_at' => now(),
        ]);

        DB::table('course_attendance')->insert([
            'id' => (string) Str::uuid(),
            'course_id' => $taskId,
            'student_id' => $passedStudent->id,
            'student_name' => $passedStudent->full_name,
            'login_code' => $passedStudent->login_code,
            'source' => 'manual',
            'created_at' => now(),
        ]);
        DB::table('course_submissions')->insert([
            'id' => (string) Str::uuid(),
            'course_id' => $taskId,
            'assessment_type' => 'tasks',
            'student_id' => $passedStudent->id,
            'student_name' => $passedStudent->full_name,
            'login_code' => $passedStudent->login_code,
            'manual_score' => null,
            'task_review_status' => 'approved',
            'submitted_at' => now(),
        ]);
        DB::table('student_parts')->insert([
            'student_id' => $passedStudent->id,
            'part_number' => 1,
            'marked_at' => now(),
        ]);

        $finalQuestionId = (string) Str::uuid();
        $finalSubmissionId = (string) Str::uuid();
        DB::table('final_exam_questions')->insert([
            'id' => $finalQuestionId,
            'branch_code' => 'male',
            'question_type' => 'text',
            'prompt' => 'سؤال نهائي',
            'options' => json_encode([]),
            'allow_file' => false,
            'points' => 10,
            'correct_answer' => 'صحيح',
            'attachment_name' => '',
            'attachment_type' => '',
            'attachment_data_url' => '',
            'sort_order' => 0,
            'created_at' => now(),
        ]);
        DB::table('final_exam_submissions')->insert([
            'id' => $finalSubmissionId,
            'branch_code' => 'male',
            'student_name' => $passedStudent->full_name,
            'login_code' => $passedStudent->login_code,
            'manual_score' => null,
            'submitted_at' => now(),
        ]);
        DB::table('final_exam_submission_answers')->insert([
            'id' => (string) Str::uuid(),
            'submission_id' => $finalSubmissionId,
            'question_id' => $finalQuestionId,
            'answer_text' => 'صحيح',
            'manual_points' => 10,
        ]);

        $this->putJson('/api/dashboard/completion-requirements/male', [
            'attendanceRequired' => 1,
            'tasksPercentageRequired' => 100,
            'finalExamPercentageRequired' => 70,
            'quranPartsRequired' => 1,
        ])->assertOk();

        $this->getJson('/api/dashboard/completion-requirements/male')
            ->assertOk()
            ->assertJsonPath('summary.passed', 1)
            ->assertJsonPath('summary.inProgress', 1)
            ->assertJsonFragment(['name' => 'معلم مجتاز', 'status' => 'passed'])
            ->assertJsonFragment(['name' => 'معلم قيد الاستكمال', 'status' => 'in_progress']);

        $this->postJson('/api/dashboard/completion-requirements/male/close')
            ->assertOk()
            ->assertJsonPath('summary.passed', 1)
            ->assertJsonPath('summary.failed', 1)
            ->assertJsonPath('settings.isClosed', true);

        $this->putJson('/api/dashboard/completion-requirements/male', [
            'attendanceRequired' => 2,
            'tasksPercentageRequired' => 100,
            'finalExamPercentageRequired' => 70,
            'quranPartsRequired' => 1,
        ])->assertUnprocessable();

        $this->postJson('/api/dashboard/completion-requirements/male/reopen')
            ->assertOk()
            ->assertJsonPath('summary.inProgress', 1)
            ->assertJsonPath('summary.failed', 0)
            ->assertJsonPath('settings.isClosed', false);

        $this->postJson('/api/dashboard/completion-requirements/male/close')->assertOk();
        $archiveResponse = $this->postJson('/api/dashboard/archives/archive-all', [
            'name' => 'أرشيف نتائج الاجتياز',
            'batch_type' => 'all',
        ])->assertOk();

        $archiveId = $archiveResponse->json('archive.id');
        $this->getJson('/api/dashboard/archives/'.$archiveId.'/students/'.$passedStudent->id)
            ->assertOk()
            ->assertJsonPath('student.completionResult.status', 'passed')
            ->assertJsonPath('student.completionResult.details.attendance.met', true);

        $this->assertDatabaseHas('completion_requirement_settings', [
            'branch_code' => 'male',
            'is_closed' => false,
        ]);
    }

    public function test_public_post_assessment_and_course_scoped_satisfaction_submit_separately(): void
    {
        $maleBranchId = DB::table('branches')->where('code', 'male')->value('id');

        Student::query()->create([
            'full_name' => 'طالب الاستبيان',
            'login_code' => '6600',
            'branch_id' => $maleBranchId,
            'note' => '',
        ]);

        $targetCourseId = (string) Str::uuid();
        $otherCourseId = (string) Str::uuid();
        $postQuestionId = (string) Str::uuid();

        DB::table('courses')->insert([
            [
                'id' => $targetCourseId,
                'title' => 'الدورة المستهدفة',
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
                'id' => $otherCourseId,
                'title' => 'دورة أخرى',
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
                'male_tasks_enabled' => false,
                'female_tasks_enabled' => false,
                'assessment_windows' => json_encode(['global' => [], 'male' => [], 'female' => []]),
                'assessment_notification_templates' => json_encode(['pre' => '', 'post' => '', 'tasks' => '']),
                'sort_order' => 1,
                'created_at' => now(),
            ],
        ]);

        DB::table('course_questions')->insert([
            'id' => $postQuestionId,
            'course_id' => $targetCourseId,
            'assessment_type' => 'post',
            'question_type' => 'text',
            'prompt' => 'سؤال بعدي للدورة',
            'options' => json_encode([]),
            'allow_file' => false,
            'points' => 4,
            'correct_answer' => '',
            'attachment_name' => '',
            'attachment_type' => '',
            'attachment_data_url' => '',
            'sort_order' => 0,
            'created_at' => now(),
        ]);

        $questionResponse = $this->postJson('/api/dashboard/satisfaction-questions', [
            'prompt' => 'كيف كانت الدورة المستهدفة؟',
            'type' => 'rating',
            'isRequired' => true,
            'targetScope' => 'course',
            'courseId' => $targetCourseId,
        ])->assertCreated();

        $questionId = $questionResponse->json('0.id');

        $this->assertDatabaseHas('satisfaction_questions', [
            'id' => $questionId,
            'course_id' => $targetCourseId,
        ]);

        $this->assertDatabaseMissing('satisfaction_questions', [
            'course_id' => $otherCourseId,
            'prompt' => 'كيف كانت الدورة المستهدفة؟',
        ]);

        Sanctum::actingAs(User::factory()->create([
            'role' => 'student',
            'login_code' => '6600',
        ]));

        $this->postJson('/api/public/assessment-submissions', [
            'courseId' => $targetCourseId,
            'assessmentType' => 'post',
            'studentName' => 'طالب الاستبيان',
            'loginId' => '6600',
            'answers' => [
                ['questionId' => $postQuestionId, 'value' => 'إجابة الاختبار البعدي'],
            ],
        ])->assertCreated();

        $this->postJson('/api/public/satisfaction-responses', [
            'responses' => [[
                'courseId' => $targetCourseId,
                'questionId' => $questionId,
                'loginCode' => '6600',
                'studentName' => 'طالب الاستبيان',
                'ratingValue' => 9,
                'textValue' => '',
            ]],
        ])->assertOk()->assertJsonPath('0.questionId', $questionId);

        $this->assertDatabaseHas('course_submissions', [
            'course_id' => $targetCourseId,
            'assessment_type' => 'post',
            'login_code' => '6600',
            'manual_score' => null,
        ]);

        $this->assertDatabaseHas('course_submission_answers', [
            'question_id' => $postQuestionId,
            'answer_text' => 'إجابة الاختبار البعدي',
        ]);

        $this->assertDatabaseHas('satisfaction_responses', [
            'course_id' => $targetCourseId,
            'question_id' => $questionId,
            'login_code' => '6600',
            'rating_value' => 9,
        ]);
    }
}
