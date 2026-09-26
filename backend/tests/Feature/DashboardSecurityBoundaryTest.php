<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\TrainingMaterial;
use App\Models\User;
use App\Services\DashboardCommunicationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardSecurityBoundaryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(DashboardCommunicationService::class)->clearCaches();
    }

    public function test_open_pre_exam_permission_does_not_allow_question_editing(): void
    {
        $this->actAsMaleManager(['open_pre_exam']);
        $courseId = (string) Str::uuid();
        DB::table('courses')->insert([
            'id' => $courseId,
            'title' => 'Protected course',
            'created_at' => now(),
        ]);

        $this->postJson("/api/dashboard/courses/{$courseId}/questions", [
            'assessmentType' => 'pre',
            'prompt' => 'Unauthorized question',
            'type' => 'text',
            'allowFile' => false,
            'points' => 1,
            'correctAnswer' => '',
        ])->assertForbidden();

        $this->assertDatabaseMissing('course_questions', [
            'course_id' => $courseId,
            'prompt' => 'Unauthorized question',
        ]);
    }

    public function test_single_edit_permission_does_not_allow_shared_course_mutations(): void
    {
        $this->actAsMaleManager(['edit_pre_questions']);
        $courseId = (string) Str::uuid();
        DB::table('courses')->insert([
            'id' => $courseId,
            'title' => 'Shared course',
            'entity_type' => 'course',
            'is_active' => true,
            'created_at' => now(),
        ]);

        $this->postJson('/api/dashboard/courses', [
            'title' => 'Unauthorized course',
            'entityType' => 'course',
        ])->assertForbidden();
        $this->putJson("/api/dashboard/courses/{$courseId}", [
            'title' => 'Tampered shared course',
        ])->assertForbidden();
        $this->deleteJson("/api/dashboard/courses/{$courseId}")
            ->assertForbidden();
        $this->putJson('/api/dashboard/courses/sort-order', [
            'orderedIds' => [$courseId],
        ])->assertForbidden();
        $this->postJson('/api/dashboard/courses/deactivate-all')
            ->assertForbidden();

        $this->assertDatabaseHas('courses', [
            'id' => $courseId,
            'title' => 'Shared course',
            'is_active' => true,
        ]);
    }

    public function test_male_manager_cannot_change_female_course_settings_and_partial_updates_preserve_them(): void
    {
        $this->actAsMaleManager(['edit_pre_questions', 'edit_post_questions']);
        $courseId = (string) Str::uuid();
        DB::table('courses')->insert([
            'id' => $courseId,
            'title' => 'Branch protected course',
            'entity_type' => 'course',
            'male_pre_enabled' => true,
            'female_pre_enabled' => false,
            'assessment_windows' => json_encode([
                'global' => [],
                'male' => ['pre' => ['closesAt' => 'male-old']],
                'female' => ['pre' => ['closesAt' => 'female-old']],
            ]),
            'created_at' => now(),
        ]);

        $this->putJson("/api/dashboard/courses/{$courseId}", [
            'branchAvailability' => [
                'female' => ['pre' => true],
            ],
            'assessmentWindows' => [
                'female' => ['pre' => ['closesAt' => 'tampered']],
            ],
        ])->assertForbidden();

        $this->putJson("/api/dashboard/courses/{$courseId}", [
            'branchAvailability' => [
                'male' => ['pre' => false],
            ],
            'assessmentWindows' => [
                'male' => ['pre' => ['closesAt' => 'male-new']],
            ],
        ])->assertNoContent();

        $course = DB::table('courses')->where('id', $courseId)->first();
        $windows = json_decode((string) $course->assessment_windows, true);
        $this->assertFalse((bool) $course->male_pre_enabled);
        $this->assertFalse((bool) $course->female_pre_enabled);
        $this->assertSame('male-new', data_get($windows, 'male.pre.closesAt'));
        $this->assertSame('female-old', data_get($windows, 'female.pre.closesAt'));
    }

    public function test_male_manager_cannot_mutate_female_final_exam_resources(): void
    {
        $this->actAsMaleManager(['page_final_exam']);
        $maleQuestionId = $this->insertFinalExamQuestion('male', 'Male question');
        $femaleQuestionId = $this->insertFinalExamQuestion('female', 'Female question');

        $this->putJson("/api/dashboard/final-exam/questions/{$femaleQuestionId}", [
            'prompt' => 'Tampered',
            'type' => 'text',
            'options' => [],
            'allowFile' => false,
            'points' => 1,
            'correctAnswer' => 'x',
        ])->assertForbidden();
        $this->deleteJson("/api/dashboard/final-exam/questions/{$femaleQuestionId}")
            ->assertForbidden();
        $this->putJson('/api/dashboard/final-exam/settings/female', [
            'isEnabled' => true,
            'closesAt' => now()->addHour()->toISOString(),
        ])->assertForbidden();
        $this->postJson('/api/dashboard/final-exam/questions/copy', [
            'from' => 'male',
            'to' => 'female',
            'move' => false,
        ])->assertForbidden();
        $this->postJson('/api/dashboard/final-exam/questions/copy', [
            'from' => 'female',
            'to' => 'male',
            'move' => true,
        ])->assertForbidden();

        $this->assertDatabaseHas('final_exam_questions', [
            'id' => $maleQuestionId,
            'prompt' => 'Male question',
        ]);
        $this->assertDatabaseHas('final_exam_questions', [
            'id' => $femaleQuestionId,
            'prompt' => 'Female question',
        ]);
    }

    public function test_training_materials_are_scoped_and_foreign_materials_cannot_be_mutated(): void
    {
        $manager = $this->actAsMaleManager(['page_materials']);
        $maleMaterial = $this->createMaterial('male', 'Male material', $manager->id);
        $femaleMaterial = $this->createMaterial('female', 'Female material', $manager->id);

        $this->getJson('/api/dashboard/training-materials')
            ->assertOk()
            ->assertJsonFragment(['id' => $maleMaterial->id, 'title' => 'Male material'])
            ->assertJsonMissing(['id' => $femaleMaterial->id]);

        $this->putJson("/api/dashboard/training-materials/{$femaleMaterial->id}", [
            'title' => 'Tampered material',
            'description' => '',
            'branchId' => 'male',
            'attachments' => [[
                'label' => 'Link',
                'url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            ]],
        ])->assertForbidden();
        $this->deleteJson("/api/dashboard/training-materials/{$femaleMaterial->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('training_materials', [
            'id' => $femaleMaterial->id,
            'title' => 'Female material',
            'target_branch_code' => 'female',
        ]);
    }

    public function test_notifications_are_branch_scoped_and_actor_identity_cannot_be_forged(): void
    {
        $manager = $this->actAsMaleManager(['page_notifications']);
        $maleStudent = $this->createStudent('male', 'male-target');
        $femaleStudent = $this->createStudent('female', 'female-target');
        $maleNotificationId = $this->insertNotification('male', []);
        $femaleNotificationId = $this->insertNotification('female', []);
        app(DashboardCommunicationService::class)->clearCaches();

        $this->getJson('/api/dashboard/notifications')
            ->assertOk()
            ->assertJsonFragment(['id' => $maleNotificationId])
            ->assertJsonMissing(['id' => $femaleNotificationId]);
        $this->deleteJson("/api/dashboard/notifications/{$femaleNotificationId}")
            ->assertForbidden();

        $this->postJson('/api/dashboard/notifications', [
            'title' => 'Cross branch attempt',
            'message' => 'Blocked',
            'targetBranchId' => 'male',
            'targetLoginIds' => [$maleStudent->login_code, $femaleStudent->login_code],
            'createdByName' => 'Forged Administrator',
            'createdByRole' => 'admin',
        ])->assertForbidden();

        $notificationResponse = $this->postJson('/api/dashboard/notifications', [
            'title' => 'Own branch notification',
            'message' => 'Allowed',
            'targetBranchId' => 'male',
            'targetLoginIds' => [$maleStudent->login_code],
            'createdByName' => 'Forged Administrator',
            'createdByRole' => 'admin',
        ])->assertCreated()
            ->assertJsonPath('targetBranchId', 'male')
            ->assertJsonPath('createdByName', $manager->full_name)
            ->assertJsonPath('createdByRole', 'male_manager');

        $this->assertDatabaseHas('notifications', [
            'id' => $notificationResponse->json('id'),
            'target_branch_code' => 'male',
            'created_by_name' => $manager->full_name,
            'created_by_role' => 'male_manager',
        ]);

    }

    public function test_dashboard_snapshot_scopes_branch_data_in_database_queries(): void
    {
        $this->actAsMaleManager(['page_overview']);
        $maleStudent = $this->createStudent('male', 'query-male');
        $femaleStudent = $this->createStudent('female', 'query-female');
        $courseId = (string) Str::uuid();
        DB::table('courses')->insert([
            'id' => $courseId,
            'title' => 'Query scoped course',
            'created_at' => now(),
        ]);

        foreach ([$maleStudent, $femaleStudent] as $student) {
            DB::table('course_submissions')->insert([
                'id' => (string) Str::uuid(),
                'course_id' => $courseId,
                'assessment_type' => 'pre',
                'student_id' => $student->id,
                'student_name' => $student->full_name,
                'login_code' => $student->login_code,
                'submitted_at' => now(),
            ]);
        }

        $queries = collect();
        DB::listen(function ($query) use ($queries): void {
            // Normalise identifier quoting so the assertions hold on SQLite and MySQL.
            $queries->push(str_replace(['`', '"'], '', strtolower($query->sql)));
        });

        $this->getJson('/api/dashboard/snapshot')
            ->assertOk()
            ->assertJsonFragment(['loginId' => 'query-male'])
            ->assertJsonMissing(['loginId' => 'query-female']);

        $submissionQuery = $queries->first(
            fn (string $sql): bool => str_contains($sql, 'from course_submissions '),
        );
        $answerQuery = $queries->first(
            fn (string $sql): bool => str_contains($sql, 'from course_submission_answers '),
        );

        $this->assertNotNull($submissionQuery);
        $this->assertNotNull($answerQuery);
        $this->assertMatchesRegularExpression('/login_code.*\bin\b/', $submissionQuery);
        $this->assertMatchesRegularExpression('/submission_id.*\bin\b/', $answerQuery);
    }

    public function test_manager_snapshot_keeps_branch_resources_without_students(): void
    {
        $this->actAsMaleManager(['page_final_exam']);
        $maleQuestionId = $this->insertFinalExamQuestion('male', 'Visible without students');
        $femaleQuestionId = $this->insertFinalExamQuestion('female', 'Hidden other branch');

        $this->getJson('/api/dashboard/snapshot')
            ->assertOk()
            ->assertJsonFragment(['id' => $maleQuestionId])
            ->assertJsonMissing(['id' => $femaleQuestionId]);
    }

    private function actAsMaleManager(array $permissions): User
    {
        DB::table('role_permissions')->where('role', 'male_manager')->delete();

        foreach ($permissions as $permission) {
            DB::table('role_permissions')->insert([
                'role' => 'male_manager',
                'permission_key' => $permission,
                'is_enabled' => true,
            ]);
        }

        $manager = User::factory()->create([
            'full_name' => 'Real Male Manager',
            'role' => 'male_manager',
            'login_code' => 'manager-male',
        ]);
        Sanctum::actingAs($manager);

        return $manager;
    }

    private function createStudent(string $branchCode, string $loginCode): Student
    {
        return Student::query()->create([
            'full_name' => ucfirst($branchCode).' Student',
            'login_code' => $loginCode,
            'branch_id' => DB::table('branches')->where('code', $branchCode)->value('id'),
            'note' => '',
        ]);
    }

    private function createMaterial(string $branchCode, string $title, string $creatorId): TrainingMaterial
    {
        return TrainingMaterial::query()->create([
            'title' => $title,
            'description' => '',
            'target_branch_code' => $branchCode,
            'external_attachments' => [[
                'id' => (string) Str::uuid(),
                'label' => 'Link',
                'url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            ]],
            'created_by' => $creatorId,
        ]);
    }

    private function insertNotification(string $branchCode, array $targetLoginIds): string
    {
        $notificationId = (string) Str::uuid();
        DB::table('notifications')->insert([
            'id' => $notificationId,
            'title' => ucfirst($branchCode).' notification',
            'message' => 'Scoped notification',
            'target_branch_code' => $branchCode,
            'target_login_ids' => json_encode($targetLoginIds),
            'created_by_name' => 'System',
            'created_by_role' => 'system',
            'created_at' => now(),
        ]);

        return $notificationId;
    }

    private function insertFinalExamQuestion(string $branchCode, string $prompt): string
    {
        $questionId = (string) Str::uuid();
        DB::table('final_exam_questions')->insert([
            'id' => $questionId,
            'branch_code' => $branchCode,
            'question_type' => 'text',
            'prompt' => $prompt,
            'options' => json_encode([]),
            'allow_file' => false,
            'points' => 1,
            'correct_answer' => 'answer',
            'sort_order' => 0,
            'created_at' => now(),
        ]);

        return $questionId;
    }
}
