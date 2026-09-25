<?php

namespace Tests\Feature;

use App\Models\Student;
use Illuminate\Support\Facades\DB;

class AssessmentSubmissionTest extends CoreDataApiTestCase
{
    public function test_manual_attendance_replaces_previous_course_records_and_appears_in_snapshot(): void
    {
        $maleBranchId = DB::table('branches')->where('code', 'male')->value('id');

        $student = Student::query()->create([
            'full_name' => 'طالب حضور',
            'login_code' => '8500',
            'branch_id' => $maleBranchId,
            'note' => '',
        ]);

        $courseId = (string) str()->uuid();

        DB::table('courses')->insert([
            'id' => $courseId,
            'title' => 'دورة حفظ',
            'entity_type' => 'course',
            'task_mode' => null,
            'task_template_id' => null,
            'task_template_name' => '',
            'task_template_content' => '',
            'youtube_url' => '',
            'is_active' => true,
            'is_pre_enabled' => true,
            'is_post_enabled' => true,
            'is_tasks_enabled' => true,
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

        DB::table('course_attendance')->insert([
            'id' => (string) str()->uuid(),
            'course_id' => $courseId,
            'student_id' => null,
            'student_name' => 'قديم',
            'login_code' => '0000',
            'source' => 'manual',
            'created_at' => now(),
        ]);

        $this->postJson('/api/dashboard/manual-attendance', [
            'courseId' => $courseId,
            'presentStudents' => [[
                'loginId' => '8500',
                'studentName' => 'طالب حضور',
                'studentId' => $student->id,
            ]],
        ])->assertNoContent();

        $this->assertDatabaseMissing('course_attendance', [
            'course_id' => $courseId,
            'login_code' => '0000',
        ]);

        $this->assertDatabaseHas('course_attendance', [
            'course_id' => $courseId,
            'login_code' => '8500',
            'student_name' => 'طالب حضور',
            'source' => 'manual',
        ]);

        $this->getJson('/api/dashboard/snapshot')
            ->assertOk()
            ->assertJsonPath('attendance.0.courseId', $courseId)
            ->assertJsonPath('attendance.0.loginId', '8500')
            ->assertJsonPath('attendance.0.source', 'manual');
    }

    public function test_assessment_submission_saves_answers_and_prevents_duplicate_attempts(): void
    {
        $maleBranchId = DB::table('branches')->where('code', 'male')->value('id');

        $student = Student::query()->create([
            'full_name' => 'طالب اختبار',
            'login_code' => '8600',
            'branch_id' => $maleBranchId,
            'note' => '',
        ]);

        Student::query()->create([
            'full_name' => 'طالب اختبار متأخر',
            'login_code' => '8601',
            'branch_id' => $maleBranchId,
            'note' => '',
        ]);

        $courseId = (string) str()->uuid();
        $questionId = (string) str()->uuid();

        DB::table('courses')->insert([
            'id' => $courseId,
            'title' => 'دورة تقييم',
            'entity_type' => 'course',
            'task_mode' => null,
            'task_template_id' => null,
            'task_template_name' => '',
            'task_template_content' => '',
            'youtube_url' => '',
            'is_active' => true,
            'is_pre_enabled' => true,
            'is_post_enabled' => true,
            'is_tasks_enabled' => true,
            'male_pre_enabled' => true,
            'female_pre_enabled' => true,
            'male_post_enabled' => true,
            'female_post_enabled' => true,
            'male_tasks_enabled' => true,
            'female_tasks_enabled' => true,
            'assessment_windows' => json_encode([
                'global' => [
                    'pre' => [
                        'opensAt' => now()->subMinutes(5)->toISOString(),
                        'closesAt' => now()->addMinutes(30)->toISOString(),
                        'durationMinutes' => 30,
                    ],
                ],
                'male' => [],
                'female' => [],
            ]),
            'assessment_notification_templates' => json_encode(['pre' => '', 'post' => '', 'tasks' => '']),
            'sort_order' => 0,
            'created_at' => now(),
        ]);

        DB::table('course_questions')->insert([
            'id' => $questionId,
            'course_id' => $courseId,
            'assessment_type' => 'pre',
            'question_type' => 'text',
            'prompt' => 'اكتب الإجابة',
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

        $response = $this->postJson('/api/dashboard/assessment-submissions', [
            'courseId' => $courseId,
            'assessmentType' => 'pre',
            'studentName' => 'طالب اختبار',
            'loginId' => '8600',
            'answers' => [[
                'questionId' => $questionId,
                'value' => 'إجابة تجريبية',
            ]],
        ]);

        $submissionId = $response->json('id');

        $response
            ->assertCreated()
            ->assertJsonStructure(['id', 'submittedAt']);

        $this->assertDatabaseHas('course_submissions', [
            'id' => $submissionId,
            'course_id' => $courseId,
            'assessment_type' => 'pre',
            'student_id' => $student->id,
            'login_code' => '8600',
        ]);

        $this->assertDatabaseHas('course_submission_answers', [
            'submission_id' => $submissionId,
            'question_id' => $questionId,
            'answer_text' => 'إجابة تجريبية',
        ]);

        $answerId = DB::table('course_submission_answers')
            ->where('submission_id', $submissionId)
            ->value('id');

        $this->putJson('/api/dashboard/assessment-submissions/'.$submissionId.'/answers/'.$answerId.'/manual-score', [
            'score' => 2,
        ])->assertUnprocessable()
            ->assertJsonPath('errors.score.0', 'الحد الأعلى لدرجة هذه الإجابة هو 1.');

        $this->putJson('/api/dashboard/assessment-submissions/'.$submissionId.'/answers/'.$answerId.'/manual-score', [
            'score' => 0.5,
        ])->assertNoContent();

        $this->assertDatabaseHas('course_submission_answers', [
            'id' => $answerId,
            'manual_points' => 0.5,
        ]);

        $this->postJson('/api/dashboard/assessment-submissions', [
            'courseId' => $courseId,
            'assessmentType' => 'pre',
            'studentName' => 'طالب اختبار',
            'loginId' => '8600',
            'answers' => [[
                'questionId' => $questionId,
                'value' => 'إجابة أخرى',
            ]],
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.loginId.0', 'تم إرسال هذا الاختبار مسبقًا، ولا يمكن إعادة الاختبار مرة أخرى.');

        $this->putJson('/api/dashboard/courses/'.$courseId, [
            'assessmentWindows' => [
                'global' => [
                    'pre' => [
                        'opensAt' => now()->subMinutes(30)->toISOString(),
                        'closesAt' => now()->subMinute()->toISOString(),
                        'durationMinutes' => 30,
                    ],
                ],
                'male' => [],
                'female' => [],
            ],
        ])->assertNoContent();

        $this->postJson('/api/dashboard/assessment-submissions', [
            'courseId' => $courseId,
            'assessmentType' => 'pre',
            'studentName' => 'طالب اختبار متأخر',
            'loginId' => '8601',
            'answers' => [[
                'questionId' => $questionId,
                'value' => 'إجابة متأخرة',
            ]],
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.loginId.0', 'انتهى وقت الإرسال أو أن التقييم غير متاح حاليًا.');

        $this->getJson('/api/dashboard/snapshot')
            ->assertOk()
            ->assertJsonPath('submissions.0.id', $submissionId)
            ->assertJsonPath('submissions.0.answers.0.questionId', $questionId)
            ->assertJsonPath('submissions.0.answers.0.manualPoints', 0.5)
            ->assertJsonPath('submissions.0.answers.0.awardedPoints', 0.5)
            ->assertJsonPath('submissions.0.answers.0.requiresManualReview', true);
    }

    public function test_assessment_submission_rejects_scriptable_file_data_url(): void
    {
        $this->postJson('/api/dashboard/assessment-submissions', [
            'courseId' => 'missing-course',
            'assessmentType' => 'pre',
            'studentName' => 'Unsafe File Student',
            'loginId' => '9910',
            'answers' => [[
                'questionId' => 'missing-question',
                'value' => '',
                'fileName' => 'unsafe.html',
                'fileType' => 'text/html',
                'fileDataUrl' => 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
            ]],
        ])->assertUnprocessable();
    }

    public function test_assessment_submission_rejects_unexpected_nested_file_payloads(): void
    {
        $this->postJson('/api/dashboard/assessment-submissions', [
            'courseId' => 'missing-course',
            'assessmentType' => 'pre',
            'studentName' => 'Unsafe File Student',
            'loginId' => '9911',
            'answers' => [[
                'questionId' => 'missing-question',
                'value' => '',
                'files' => [[
                    'fileName' => 'unsafe.svg',
                    'fileType' => 'image/svg+xml',
                    'dataUrl' => 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+',
                ]],
            ]],
        ])->assertUnprocessable();
    }

    public function test_opening_assessments_tasks_and_final_exam_creates_notifications_from_saved_templates(): void
    {
        $courseId = (string) str()->uuid();

        DB::table('courses')->insert([
            'id' => $courseId,
            'title' => 'دورة الإشعارات',
            'entity_type' => 'course',
            'task_mode' => null,
            'task_template_id' => null,
            'task_template_name' => '',
            'task_template_content' => '',
            'youtube_url' => '',
            'is_active' => false,
            'is_pre_enabled' => false,
            'is_post_enabled' => false,
            'is_tasks_enabled' => false,
            'male_pre_enabled' => true,
            'female_pre_enabled' => true,
            'male_post_enabled' => true,
            'female_post_enabled' => true,
            'male_tasks_enabled' => true,
            'female_tasks_enabled' => false,
            'assessment_windows' => json_encode([
                'global' => [],
                'male' => ['tasks' => ['closesAt' => now()->addMinutes(60)->toISOString(), 'durationMinutes' => 60]],
                'female' => [],
            ], JSON_UNESCAPED_UNICODE),
            'assessment_notification_templates' => json_encode([
                'pre' => 'تم فتح {assessmentLabel} في {courseTitle} لفرع {branchLabel} لمدة {durationMinutes} دقيقة.',
                'post' => 'تم فتح {assessmentLabel} في {courseTitle} لفرع {branchLabel} لمدة {durationMinutes} دقيقة.',
                'tasks' => 'تم فتح {assessmentLabel} في {courseTitle} لفرع {branchLabel} لمدة {durationMinutes} دقيقة.',
            ], JSON_UNESCAPED_UNICODE),
            'sort_order' => 0,
            'created_at' => now(),
        ]);

        $this->putJson('/api/dashboard/courses/'.$courseId, [
            'assessmentWindows' => [
                'global' => [
                    'pre' => [
                        'closesAt' => now()->addMinutes(45)->toISOString(),
                        'durationMinutes' => 45,
                    ],
                ],
                'male' => ['tasks' => ['closesAt' => now()->addMinutes(60)->toISOString(), 'durationMinutes' => 60]],
                'female' => [],
            ],
        ])->assertNoContent();

        $this->postJson('/api/dashboard/courses/'.$courseId.'/activate', [
            'pre' => true,
            'post' => false,
            'tasks' => false,
        ])->assertNoContent();

        $this->assertDatabaseHas('notifications', [
            'title' => 'الاختبار القبلي - دورة الإشعارات',
            'target_branch_code' => 'male',
        ]);

        $this->assertDatabaseHas('notifications', [
            'title' => 'الاختبار القبلي - دورة الإشعارات',
            'target_branch_code' => 'female',
        ]);

        $this->putJson('/api/dashboard/courses/'.$courseId, [
            'isTasksEnabled' => true,
            'branchAvailability' => [
                'male' => ['pre' => true, 'post' => true, 'tasks' => true],
                'female' => ['pre' => true, 'post' => true, 'tasks' => false],
            ],
            'assessmentWindows' => [
                'global' => ['pre' => ['closesAt' => now()->addMinutes(45)->toISOString(), 'durationMinutes' => 45]],
                'male' => ['tasks' => ['closesAt' => now()->addMinutes(90)->toISOString(), 'durationMinutes' => 90]],
                'female' => [],
            ],
        ])->assertNoContent();

        $this->assertDatabaseHas('notifications', [
            'title' => 'المهام الأدائية - دورة الإشعارات',
            'target_branch_code' => 'male',
        ]);

        $this->putJson('/api/dashboard/final-exam/settings/male', [
            'isEnabled' => true,
            'closesAt' => now()->addMinutes(75)->format('Y-m-d H:i:s'),
            'notificationTemplate' => 'تم فتح الاختبار النهائي لفرع {branchLabel} لمدة {durationMinutes} دقيقة.',
        ])->assertNoContent();

        $this->assertDatabaseHas('notifications', [
            'title' => 'الاختبار النهائي',
            'target_branch_code' => 'male',
        ]);

        $messages = DB::table('notifications')->pluck('message', 'title');

        $this->assertStringContainsString('دورة الإشعارات', (string) $messages['الاختبار القبلي - دورة الإشعارات']);
        $this->assertStringContainsString('معلمين', (string) $messages['المهام الأدائية - دورة الإشعارات']);
        $this->assertStringContainsString('معلمين', (string) $messages['الاختبار النهائي']);
    }
}
