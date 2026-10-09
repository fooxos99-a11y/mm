<?php

namespace Tests\Feature;

use App\Models\Student;
use Illuminate\Support\Facades\DB;

class CourseTaskManagementTest extends CoreDataApiTestCase
{
    public function test_course_and_question_management_flows_work(): void
    {
        $firstCourseResponse = $this->postJson('/api/dashboard/courses', [
            'title' => 'الدورة الأولى',
            'isActive' => true,
        ])->assertCreated();

        $firstCourseId = $firstCourseResponse->json('id');

        $taskCourseResponse = $this->postJson('/api/dashboard/courses', [
            'title' => 'مهمة منزلية',
            'entityType' => 'task',
            'taskMode' => 'document',
            'taskTemplateName' => 'قالب',
            'taskTemplateContent' => 'محتوى',
        ])->assertCreated();

        $taskCourseId = $taskCourseResponse->json('id');

        $this->putJson('/api/dashboard/courses/'.$firstCourseId, [
            'title' => 'الدورة المحدثة',
            'isPostEnabled' => false,
            'branchAvailability' => [
                'male' => ['pre' => true, 'post' => false, 'tasks' => true],
                'female' => ['pre' => true, 'post' => true, 'tasks' => false],
            ],
            'assessmentWindows' => [
                'global' => ['pre' => '2026-05-01T00:00:00.000Z'],
                'male' => [],
                'female' => [],
            ],
            'assessmentNotificationTemplates' => [
                'pre' => 'قبل',
                'post' => 'بعد',
                'tasks' => 'واجب',
            ],
            'youtubeUrl' => 'https://example.com/watch',
        ])->assertNoContent();

        $questionResponse = $this->postJson('/api/dashboard/courses/'.$firstCourseId.'/questions', [
            'assessmentType' => 'pre',
            'prompt' => 'سؤال صح وخطأ',
            'type' => 'truefalse',
            'options' => [],
            'allowFile' => false,
            'points' => 2,
            'correctAnswer' => 'صح',
        ])->assertCreated();

        $questionId = $questionResponse->json('id');

        $this->putJson('/api/dashboard/courses/sort-order', [
            'orderedIds' => [$taskCourseId, $firstCourseId],
        ])->assertNoContent();

        $this->postJson('/api/dashboard/courses/'.$firstCourseId.'/activate', [
            'pre' => true,
            'post' => false,
            'tasks' => true,
        ])->assertNoContent();

        $snapshot = $this->getJson('/api/dashboard/snapshot')->assertOk();

        $snapshot
            ->assertJsonPath('courses.0.id', $taskCourseId)
            ->assertJsonPath('courses.1.id', $firstCourseId)
            ->assertJsonPath('courses.1.title', 'الدورة المحدثة')
            ->assertJsonPath('courses.1.isActive', true)
            ->assertJsonPath('courses.1.isPostEnabled', false)
            ->assertJsonPath('courses.1.branchAvailability.male.post', false)
            ->assertJsonPath('courses.1.assessmentNotificationTemplates.tasks', 'واجب')
            ->assertJsonPath('courses.1.preQuestions.0.id', $questionId)
            ->assertJsonPath('courses.1.preQuestions.0.type', 'truefalse');

        $this->postJson('/api/dashboard/courses/deactivate-all')->assertNoContent();

        $this->deleteJson('/api/dashboard/questions/'.$questionId)->assertNoContent();
        $this->deleteJson('/api/dashboard/courses/'.$taskCourseId)->assertNoContent();

        $this->assertDatabaseMissing('course_questions', ['id' => $questionId]);
        $this->assertDatabaseMissing('courses', ['id' => $taskCourseId]);
    }

    public function test_opening_a_task_closes_the_previous_open_task(): void
    {
        $firstTaskId = $this->postJson('/api/dashboard/courses', [
            'title' => 'المهمة الأولى',
            'entityType' => 'task',
            'taskMode' => 'document',
            'taskTemplateName' => 'قالب أول',
            'taskTemplateContent' => 'محتوى أول',
        ])->assertCreated()->json('id');

        $secondTaskId = $this->postJson('/api/dashboard/courses', [
            'title' => 'المهمة الثانية',
            'entityType' => 'task',
            'taskMode' => 'document',
            'taskTemplateName' => 'قالب ثان',
            'taskTemplateContent' => 'محتوى ثان',
        ])->assertCreated()->json('id');

        $this->putJson('/api/dashboard/courses/'.$firstTaskId, [
            'isTasksEnabled' => true,
            'branchAvailability' => [
                'male' => ['pre' => true, 'post' => true, 'tasks' => true],
                'female' => ['pre' => true, 'post' => true, 'tasks' => true],
            ],
            'assessmentWindows' => [
                'global' => [],
                'male' => ['tasks' => ['closesAt' => now()->addMinutes(40)->toISOString(), 'durationMinutes' => 40]],
                'female' => ['tasks' => ['closesAt' => now()->addMinutes(40)->toISOString(), 'durationMinutes' => 40]],
            ],
        ])->assertNoContent();

        $this->putJson('/api/dashboard/courses/'.$secondTaskId, [
            'isTasksEnabled' => true,
            'branchAvailability' => [
                'male' => ['pre' => true, 'post' => true, 'tasks' => true],
                'female' => ['pre' => true, 'post' => true, 'tasks' => true],
            ],
            'assessmentWindows' => [
                'global' => [],
                'male' => ['tasks' => ['closesAt' => now()->addMinutes(55)->toISOString(), 'durationMinutes' => 55]],
                'female' => ['tasks' => ['closesAt' => now()->addMinutes(55)->toISOString(), 'durationMinutes' => 55]],
            ],
        ])->assertNoContent();

        $snapshot = $this->getJson('/api/dashboard/snapshot')->assertOk();

        $snapshot
            ->assertJsonPath('courses.0.id', $firstTaskId)
            ->assertJsonPath('courses.0.isTasksEnabled', false)
            ->assertJsonPath('courses.0.branchAvailability.male.tasks', false)
            ->assertJsonPath('courses.0.branchAvailability.female.tasks', false)
            ->assertJsonPath('courses.1.id', $secondTaskId)
            ->assertJsonPath('courses.1.isTasksEnabled', true)
            ->assertJsonPath('courses.1.branchAvailability.male.tasks', true)
            ->assertJsonPath('courses.1.branchAvailability.female.tasks', true);
    }

    public function test_document_task_creation_adds_its_attachment_question_atomically(): void
    {
        $taskId = $this->postJson('/api/dashboard/courses', [
            'title' => 'مهمة وورد',
            'entityType' => 'task',
            'taskMode' => 'document',
            'taskPoints' => 7,
        ])->assertCreated()->json('id');

        $this->getJson('/api/dashboard/snapshot')
            ->assertOk()
            ->assertJsonPath('courses.0.id', $taskId)
            ->assertJsonPath('courses.0.taskQuestions.0.allowFile', true)
            ->assertJsonPath('courses.0.taskQuestions.0.points', 7);
    }

    public function test_question_sync_is_atomic_and_updates_task_metadata(): void
    {
        $taskId = $this->postJson('/api/dashboard/courses', [
            'title' => 'مهمة أسئلة',
            'entityType' => 'task',
            'taskMode' => 'questions',
        ])->assertCreated()->json('id');

        $firstQuestionId = $this->postJson('/api/dashboard/courses/'.$taskId.'/questions', [
            'assessmentType' => 'tasks',
            'prompt' => 'السؤال الأول',
            'type' => 'text',
            'options' => [],
            'allowFile' => false,
            'points' => 1,
            'correctAnswer' => '',
        ])->assertCreated()->json('id');

        $deletedQuestionId = $this->postJson('/api/dashboard/courses/'.$taskId.'/questions', [
            'assessmentType' => 'tasks',
            'prompt' => 'سيحذف',
            'type' => 'text',
            'options' => [],
            'allowFile' => false,
            'points' => 1,
            'correctAnswer' => '',
        ])->assertCreated()->json('id');

        $this->putJson('/api/dashboard/courses/'.$taskId.'/questions/sync', [
            'assessmentType' => 'tasks',
            'questions' => [
                [
                    'id' => $firstQuestionId,
                    'prompt' => 'السؤال المعدل',
                    'type' => 'text',
                    'options' => [],
                    'allowFile' => false,
                    'points' => 3,
                    'correctAnswer' => '',
                ],
                [
                    'prompt' => 'سؤال جديد',
                    'type' => 'multiple',
                    'options' => ['أ', 'ب'],
                    'allowFile' => false,
                    'points' => 5,
                    'correctAnswer' => 'أ',
                ],
            ],
            'deletedQuestionIds' => [$deletedQuestionId],
            'courseUpdates' => [
                'youtubeUrl' => 'https://example.com/task-video',
                'taskDescription' => 'وصف المهمة',
            ],
        ])->assertOk()->assertJsonCount(2, 'questions')
            ->assertJsonPath('questions.0.id', $firstQuestionId)
            ->assertJsonPath('questions.1.correctAnswer', 'أ');

        $this->assertDatabaseHas('course_questions', [
            'id' => $firstQuestionId,
            'prompt' => 'السؤال المعدل',
            'points' => 3,
        ]);
        $this->assertDatabaseMissing('course_questions', ['id' => $deletedQuestionId]);
        $this->assertDatabaseHas('course_questions', [
            'course_id' => $taskId,
            'prompt' => 'سؤال جديد',
            'points' => 5,
        ]);
        $this->assertDatabaseHas('courses', [
            'id' => $taskId,
            'youtube_url' => 'https://example.com/task-video',
            'task_description' => 'وصف المهمة',
        ]);
    }

    public function test_question_sync_rejects_foreign_question_ids_without_partial_changes(): void
    {
        $firstTaskId = $this->postJson('/api/dashboard/courses', [
            'title' => 'المهمة الأولى', 'entityType' => 'task', 'taskMode' => 'questions',
        ])->assertCreated()->json('id');
        $secondTaskId = $this->postJson('/api/dashboard/courses', [
            'title' => 'المهمة الثانية', 'entityType' => 'task', 'taskMode' => 'questions',
        ])->assertCreated()->json('id');
        $foreignQuestionId = $this->postJson('/api/dashboard/courses/'.$secondTaskId.'/questions', [
            'assessmentType' => 'tasks', 'prompt' => 'سؤال أجنبي', 'type' => 'text',
            'options' => [], 'allowFile' => false, 'points' => 1, 'correctAnswer' => '',
        ])->assertCreated()->json('id');

        $this->putJson('/api/dashboard/courses/'.$firstTaskId.'/questions/sync', [
            'assessmentType' => 'tasks',
            'questions' => [[
                'id' => $foreignQuestionId, 'prompt' => 'محاولة تعديل', 'type' => 'text',
                'options' => [], 'allowFile' => false, 'points' => 2, 'correctAnswer' => '',
            ]],
            'courseUpdates' => ['taskDescription' => 'يجب ألا يحفظ'],
        ])->assertUnprocessable();

        $this->assertDatabaseHas('course_questions', ['id' => $foreignQuestionId, 'prompt' => 'سؤال أجنبي']);
        $this->assertDatabaseHas('courses', ['id' => $firstTaskId, 'task_description' => '']);
    }

    public function test_bulk_assessment_import_replaces_existing_rows_and_preserves_manual_scores(): void
    {
        $maleBranchId = DB::table('branches')->where('code', 'male')->value('id');

        Student::query()->create([
            'full_name' => 'طالب أول',
            'login_code' => '8700',
            'branch_id' => $maleBranchId,
            'note' => '',
        ]);

        Student::query()->create([
            'full_name' => 'طالب ثان',
            'login_code' => '8701',
            'branch_id' => $maleBranchId,
            'note' => '',
        ]);

        $courseId = (string) str()->uuid();
        $questionId = (string) str()->uuid();

        DB::table('courses')->insert([
            'id' => $courseId,
            'title' => 'استيراد نتائج',
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

        DB::table('course_questions')->insert([
            'id' => $questionId,
            'course_id' => $courseId,
            'assessment_type' => 'post',
            'question_type' => 'text',
            'prompt' => 'اكتب',
            'options' => json_encode([]),
            'allow_file' => false,
            'points' => 1,
            'correct_answer' => '',
            'attachment_name' => '',
            'attachment_type' => '',
            'attachment_data_url' => '',
            'sort_order' => 0,
            'created_at' => now(),
        ]);

        $existingSubmissionId = (string) str()->uuid();
        DB::table('course_submissions')->insert([
            'id' => $existingSubmissionId,
            'course_id' => $courseId,
            'assessment_type' => 'post',
            'student_id' => null,
            'student_name' => 'طالب أول',
            'login_code' => '8700',
            'manual_score' => 1,
            'submitted_at' => now(),
        ]);
        DB::table('course_submission_answers')->insert([
            'id' => (string) str()->uuid(),
            'submission_id' => $existingSubmissionId,
            'question_id' => $questionId,
            'answer_text' => 'قديم',
            'created_at' => now(),
        ]);

        $response = $this->postJson('/api/dashboard/assessment-import', [
            'courseId' => $courseId,
            'assessmentType' => 'post',
            'submissions' => [
                [
                    'studentName' => 'طالب أول',
                    'loginId' => '8700',
                    'manualScore' => 8,
                    'answers' => [
                        ['questionId' => $questionId, 'value' => 'جديد'],
                        ['questionId' => '__score_override__', 'value' => '8'],
                    ],
                ],
                [
                    'studentName' => 'طالب ثان',
                    'loginId' => '8701',
                    'manualScore' => null,
                    'answers' => [
                        ['questionId' => $questionId, 'value' => 'مستورد'],
                    ],
                ],
            ],
        ])->assertOk();

        $response->assertJsonCount(2);

        $this->assertDatabaseMissing('course_submission_answers', [
            'submission_id' => $existingSubmissionId,
            'answer_text' => 'قديم',
        ]);

        $this->assertDatabaseHas('course_submissions', [
            'course_id' => $courseId,
            'assessment_type' => 'post',
            'login_code' => '8700',
            'manual_score' => 8,
        ]);

        $this->assertDatabaseHas('course_submissions', [
            'course_id' => $courseId,
            'assessment_type' => 'post',
            'login_code' => '8701',
        ]);

        $this->assertDatabaseHas('course_submission_answers', [
            'question_id' => $questionId,
            'answer_text' => 'جديد',
        ]);

        $this->getJson('/api/dashboard/snapshot')
            ->assertOk()
            ->assertJsonPath('submissions.0.courseId', $courseId);
    }
}
