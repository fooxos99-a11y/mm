<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PublicContentArchiveTest extends CoreDataApiTestCase
{
    public function test_home_page_content_can_be_updated_and_is_exposed_in_public_snapshot(): void
    {
        $response = $this->putJson('/api/dashboard/home-page-content', [
            'content' => [
                'brandTitle' => 'الرئيسية المخصصة',
                'heroTitle' => 'واجهة تعريفية جديدة',
                'heroText' => 'هذا نص تعريفي جديد للصفحة الرئيسية.',
                'heroPrimaryButtonLabel' => 'استعرض الرخص',
                'programAvailableActionLabel' => 'ابدأ الآن',
                'achievements' => [
                    'licenseCountTitle' => 'عدد الرخص',
                ],
                'programs' => [
                    [
                        'title' => 'رخصة ممارس المطورة',
                        'description' => 'وصف مخصص للرخصة الأولى.',
                        'features' => ['ميزة أولى', 'ميزة ثانية', 'ميزة ثالثة'],
                    ],
                ],
                'faqItems' => [
                    [
                        'question' => 'سؤال شائع مخصص؟',
                        'answer' => 'إجابة مخصصة من لوحة الإعدادات.',
                    ],
                ],
            ],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('brandTitle', 'الرئيسية المخصصة')
            ->assertJsonPath('heroTitle', 'واجهة تعريفية جديدة')
            ->assertJsonPath('achievements.licenseCountTitle', 'عدد الرخص')
            ->assertJsonPath('programs.0.title', 'رخصة ممارس المطورة')
            ->assertJsonPath('faqItems.0.question', 'سؤال شائع مخصص؟');

        $this->assertDatabaseHas('app_settings', [
            'setting_key' => 'home_page_content',
        ]);

        $this->getJson('/api/public/snapshot')
            ->assertOk()
            ->assertJsonPath('homePageContent.brandTitle', 'الرئيسية المخصصة')
            ->assertJsonPath('homePageContent.heroPrimaryButtonLabel', 'استعرض الرخص')
            ->assertJsonPath('homePageContent.programAvailableActionLabel', 'ابدأ الآن')
            ->assertJsonPath('homePageContent.programs.0.features.2', 'ميزة ثالثة')
            ->assertJsonPath('homePageContent.faqItems.0.answer', 'إجابة مخصصة من لوحة الإعدادات.');
    }

    public function test_practitioner_page_content_can_be_updated_and_is_exposed_in_public_snapshot(): void
    {
        $response = $this->putJson('/api/dashboard/practitioner-page-content', [
            'content' => [
                'heroTitle' => 'واجهة رخصة ممارس المحدثة',
                'heroPrimaryButtonLabel' => 'ابدأ التسجيل',
                'aboutBody' => 'وصف جديد لصفحة رخصة ممارس من لوحة الإعدادات.',
                'goals' => [
                    'هدف أول مخصص',
                    'هدف ثانٍ مخصص',
                ],
                'indicatorLabels' => [
                    'tasks' => 'المهام التطبيقية',
                ],
                'startDates' => [
                    ['tag' => 'الرجال', 'text' => 'الأحد 01 / 01 / 1448هـ'],
                ],
            ],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('heroTitle', 'واجهة رخصة ممارس المحدثة')
            ->assertJsonPath('heroPrimaryButtonLabel', 'ابدأ التسجيل')
            ->assertJsonPath('aboutBody', 'وصف جديد لصفحة رخصة ممارس من لوحة الإعدادات.')
            ->assertJsonPath('goals.0', 'هدف أول مخصص')
            ->assertJsonPath('indicatorLabels.tasks', 'المهام التطبيقية')
            ->assertJsonPath('startDates.0.text', 'الأحد 01 / 01 / 1448هـ');

        $this->assertDatabaseHas('app_settings', [
            'setting_key' => 'practitioner_page_content',
        ]);

        $this->getJson('/api/public/snapshot')
            ->assertOk()
            ->assertJsonPath('practitionerPageContent.heroTitle', 'واجهة رخصة ممارس المحدثة')
            ->assertJsonPath('practitionerPageContent.heroPrimaryButtonLabel', 'ابدأ التسجيل')
            ->assertJsonPath('practitionerPageContent.aboutBody', 'وصف جديد لصفحة رخصة ممارس من لوحة الإعدادات.')
            ->assertJsonPath('practitionerPageContent.indicatorLabels.tasks', 'المهام التطبيقية')
            ->assertJsonPath('practitionerPageContent.startDates.0.text', 'الأحد 01 / 01 / 1448هـ');
    }

    public function test_archive_all_persists_full_educational_snapshot_and_detaches_reciters(): void
    {
        $maleBranchId = DB::table('branches')->where('code', 'male')->value('id');

        $studentId = (string) Str::uuid();
        $courseId = (string) Str::uuid();
        $questionId = (string) Str::uuid();
        $submissionId = (string) Str::uuid();
        $submissionAnswerId = (string) Str::uuid();
        $attendanceId = (string) Str::uuid();
        $satisfactionQuestionId = (string) Str::uuid();
        $satisfactionResponseId = (string) Str::uuid();
        $finalQuestionId = (string) Str::uuid();
        $finalSubmissionId = (string) Str::uuid();
        $finalAnswerId = (string) Str::uuid();
        $reciterUserId = (string) Str::uuid();
        $reciterId = (string) Str::uuid();

        DB::table('students')->insert([
            'id' => $studentId,
            'full_name' => 'طالب أرشيف شامل',
            'login_code' => '8610',
            'branch_id' => $maleBranchId,
            'note' => 'ملاحظة أرشيف',
            'is_certified' => true,
            'created_at' => now(),
        ]);

        DB::table('users')->insert([
            'id' => $reciterUserId,
            'full_name' => 'مقرئ أرشيف',
            'role' => 'reciter',
            'login_code' => '9301',
            'password' => Hash::make('9301'),
            'created_at' => now(),
        ]);

        DB::table('reciters')->insert([
            'id' => $reciterId,
            'full_name' => 'مقرئ أرشيف',
            'user_id' => $reciterUserId,
            'branch_id' => $maleBranchId,
            'created_at' => now(),
        ]);

        DB::table('reciter_students')->insert([
            'reciter_id' => $reciterId,
            'student_id' => $studentId,
            'created_at' => now(),
        ]);

        DB::table('student_parts')->insert([
            'student_id' => $studentId,
            'part_number' => 3,
            'marked_by_reciter_id' => $reciterId,
            'marked_at' => now(),
        ]);

        DB::table('courses')->insert([
            'id' => $courseId,
            'title' => 'دورة الأرشيف',
            'entity_type' => 'course',
            'task_mode' => null,
            'task_template_id' => null,
            'task_template_name' => '',
            'task_template_content' => null,
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
            'assessment_windows' => null,
            'assessment_notification_templates' => null,
            'sort_order' => 1,
            'created_by' => null,
            'created_at' => now(),
        ]);

        DB::table('course_questions')->insert([
            'id' => $questionId,
            'course_id' => $courseId,
            'assessment_type' => 'pre',
            'question_type' => 'text',
            'prompt' => 'سؤال قبلي',
            'options' => null,
            'allow_file' => false,
            'points' => 5,
            'correct_answer' => null,
            'attachment_name' => '',
            'attachment_type' => '',
            'attachment_data_url' => null,
            'sort_order' => 1,
            'created_at' => now(),
        ]);

        DB::table('course_submissions')->insert([
            'id' => $submissionId,
            'course_id' => $courseId,
            'assessment_type' => 'pre',
            'student_id' => $studentId,
            'student_name' => 'طالب أرشيف شامل',
            'login_code' => '8610',
            'manual_score' => 88,
            'submitted_at' => now(),
        ]);

        DB::table('course_submission_answers')->insert([
            'id' => $submissionAnswerId,
            'submission_id' => $submissionId,
            'question_id' => $questionId,
            'answer_text' => 'إجابة قبلي',
            'file_name' => null,
            'file_type' => null,
            'file_data_url' => null,
            'created_at' => now(),
        ]);

        DB::table('course_attendance')->insert([
            'id' => $attendanceId,
            'course_id' => $courseId,
            'student_id' => $studentId,
            'student_name' => 'طالب أرشيف شامل',
            'login_code' => '8610',
            'source' => 'manual',
            'created_at' => now(),
        ]);

        DB::table('satisfaction_questions')->insert([
            'id' => $satisfactionQuestionId,
            'course_id' => $courseId,
            'prompt' => 'كيف كان المستوى؟',
            'type' => 'rating',
            'is_required' => true,
            'sort_order' => 1,
            'created_at' => now(),
        ]);

        DB::table('satisfaction_responses')->insert([
            'id' => $satisfactionResponseId,
            'course_id' => $courseId,
            'question_id' => $satisfactionQuestionId,
            'login_code' => '8610',
            'student_name' => 'طالب أرشيف شامل',
            'rating_value' => 9,
            'text_value' => 'ممتاز',
            'submitted_at' => now(),
        ]);

        DB::table('final_exam_questions')->insert([
            'id' => $finalQuestionId,
            'branch_code' => 'male',
            'question_type' => 'text',
            'prompt' => 'سؤال نهائي',
            'options' => null,
            'allow_file' => false,
            'points' => 10,
            'correct_answer' => null,
            'attachment_name' => '',
            'attachment_type' => '',
            'attachment_data_url' => null,
            'sort_order' => 1,
            'created_at' => now(),
        ]);

        DB::table('final_exam_submissions')->insert([
            'id' => $finalSubmissionId,
            'branch_code' => 'male',
            'student_name' => 'طالب أرشيف شامل',
            'login_code' => '8610',
            'manual_score' => 93,
            'submitted_at' => now(),
        ]);

        DB::table('final_exam_submission_answers')->insert([
            'id' => $finalAnswerId,
            'submission_id' => $finalSubmissionId,
            'question_id' => $finalQuestionId,
            'answer_text' => 'إجابة نهائية',
            'file_name' => null,
            'file_type' => null,
            'file_data_url' => null,
        ]);

        $archiveResponse = $this->postJson('/api/dashboard/archives/archive-all', [
            'name' => 'دفعة الأرشيف الشامل',
            'batch_type' => 'all',
        ]);

        $archiveId = $archiveResponse->json('archive.id');

        $archiveResponse->assertOk()->assertJsonPath('archive.name', 'دفعة الأرشيف الشامل');

        $this->assertDatabaseHas('students', ['id' => $studentId, 'archive_id' => $archiveId, 'archived_login_code' => '8610']);
        $this->assertDatabaseHas('courses', ['id' => $courseId, 'archive_id' => null]);
        $this->assertDatabaseHas('course_questions', ['id' => $questionId, 'archive_id' => null]);
        $archivedCourseId = DB::table('courses')
            ->where('archive_id', $archiveId)
            ->where('title', 'دورة الأرشيف')
            ->value('id');
        $archivedQuestionId = DB::table('course_questions')
            ->where('archive_id', $archiveId)
            ->where('prompt', 'سؤال قبلي')
            ->value('id');
        $this->assertNotNull($archivedCourseId);
        $this->assertNotNull($archivedQuestionId);
        $this->assertNotSame($courseId, $archivedCourseId);
        $this->assertNotSame($questionId, $archivedQuestionId);
        $this->assertDatabaseHas('course_submissions', ['id' => $submissionId, 'archive_id' => $archiveId]);
        $this->assertDatabaseHas('course_submission_answers', ['id' => $submissionAnswerId, 'archive_id' => $archiveId]);
        $this->assertDatabaseHas('course_attendance', ['id' => $attendanceId, 'archive_id' => $archiveId]);
        $this->assertDatabaseHas('satisfaction_questions', ['id' => $satisfactionQuestionId, 'archive_id' => null]);
        $this->assertDatabaseHas('satisfaction_responses', ['id' => $satisfactionResponseId, 'archive_id' => $archiveId]);
        $this->assertDatabaseHas('final_exam_questions', ['id' => $finalQuestionId, 'archive_id' => null]);
        $this->assertDatabaseHas('final_exam_submissions', ['id' => $finalSubmissionId, 'archive_id' => $archiveId]);
        $this->assertDatabaseHas('final_exam_submission_answers', ['id' => $finalAnswerId, 'archive_id' => $archiveId]);
        $this->assertDatabaseMissing('reciter_students', ['reciter_id' => $reciterId, 'student_id' => $studentId]);
        $this->assertDatabaseMissing('users', ['login_code' => '8610', 'role' => 'student']);

        $archivedStudentLoginCode = DB::table('students')->where('id', $studentId)->value('login_code');

        $this->assertNotSame('8610', $archivedStudentLoginCode);

        $this->getJson('/api/dashboard/snapshot')
            ->assertOk()
            ->assertJsonMissing(['loginId' => '8610'])
            ->assertJsonFragment(['title' => 'دورة الأرشيف']);

        $this->postJson('/api/students', [
            'name' => 'طالب جديد بعد الأرشفة',
            'loginId' => '8610',
            'password' => 'Secure-password-1234',
            'passwordConfirmation' => 'Secure-password-1234',
            'branchId' => 'male',
            'note' => 'إعادة استخدام الرقم',
        ])
            ->assertCreated()
            ->assertJsonPath('loginId', '8610');

        $this->getJson('/api/dashboard/archives/'.$archiveId.'/students/'.$studentId)
            ->assertOk()
            ->assertJsonPath('student.name', 'طالب أرشيف شامل')
            ->assertJsonPath('summary.preTests', 1)
            ->assertJsonPath('summary.attendance', 1)
            ->assertJsonPath('courses.0.title', 'دورة الأرشيف')
            ->assertJsonPath('courses.0.pre.manualScore', 88)
            ->assertJsonPath('courses.0.attendance.isPresent', true)
            ->assertJsonPath('courses.0.satisfactionResponses.0.ratingValue', 9)
            ->assertJsonPath('finalExam.manualScore', 93);
    }

    public function test_archive_all_respects_the_selected_branch(): void
    {
        $this->postJson('/api/students', [
            'name' => 'معلم الأرشيف',
            'loginId' => '7611',
            'password' => 'Secure-password-1234',
            'passwordConfirmation' => 'Secure-password-1234',
            'branchId' => 'male',
        ])->assertCreated();
        $this->postJson('/api/students', [
            'name' => 'معلمة تبقى نشطة',
            'loginId' => '7612',
            'password' => 'Secure-password-1234',
            'passwordConfirmation' => 'Secure-password-1234',
            'branchId' => 'female',
        ])->assertCreated();

        $this->postJson('/api/dashboard/archives/archive-all', [
            'name' => 'دفعة المعلمين',
            'batch_type' => 'male',
        ])->assertOk();

        $this->assertDatabaseHas('students', ['login_code' => '7612', 'archive_id' => null]);
        $this->assertDatabaseMissing('students', ['login_code' => '7611', 'archive_id' => null]);
        $this->assertDatabaseHas('archives', ['name' => 'دفعة المعلمين', 'batch_type' => 'male']);
    }

    public function test_selected_archive_can_be_permanently_deleted_without_touching_active_students(): void
    {
        $archive = $this->postJson('/api/dashboard/archives', [
            'name' => 'أرشيف للحذف النهائي',
            'courses_count' => 0,
            'batch_type' => 'all',
        ])->assertCreated();

        $archiveId = $archive->json('id');
        $branchId = DB::table('branches')->where('code', 'male')->value('id');
        $archivedStudentId = (string) Str::uuid();
        $activeStudentId = (string) Str::uuid();

        DB::table('students')->insert([
            [
                'id' => $archivedStudentId,
                'full_name' => 'طالب داخل الأرشيف',
                'login_code' => 'archive-delete-1',
                'branch_id' => $branchId,
                'archive_id' => $archiveId,
                'created_at' => now(),
            ],
            [
                'id' => $activeStudentId,
                'full_name' => 'طالب نشط',
                'login_code' => 'archive-delete-2',
                'branch_id' => $branchId,
                'archive_id' => null,
                'created_at' => now(),
            ],
        ]);

        $this->deleteJson('/api/dashboard/archives/'.$archiveId)
            ->assertOk()
            ->assertJsonPath('message', 'Archive deleted successfully');

        $this->assertDatabaseMissing('archives', ['id' => $archiveId]);
        $this->assertDatabaseMissing('students', ['id' => $archivedStudentId]);
        $this->assertDatabaseHas('students', ['id' => $activeStudentId, 'archive_id' => null]);
        $this->getJson('/api/dashboard/archives/'.$archiveId)->assertNotFound();
    }
}
