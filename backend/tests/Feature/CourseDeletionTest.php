<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\CourseManagementService;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class CourseDeletionTest extends TestCase
{
    use DatabaseMigrations;

    protected function setUp(): void
    {
        parent::setUp();
        config(['filesystems.assessment_disk' => 'local']);
        Storage::fake('local');
    }

    public static function entities(): array
    {
        return [['course', null], ['task', 'questions'], ['task', 'document']];
    }

    #[DataProvider('entities')]
    public function test_deletion_removes_all_related_history_and_preserves_other_data(string $type, ?string $mode): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $target = $this->createHistory($type, $mode);
        $other = $this->createHistory('course');
        $globalQuestion = (string) str()->uuid();
        DB::table('satisfaction_questions')->insert(['id' => $globalQuestion, 'prompt' => 'General survey']);
        DB::table('satisfaction_responses')->insert([
            'id' => (string) str()->uuid(), 'course_id' => $target['id'],
            'question_id' => $globalQuestion, 'student_name' => 'Test student', 'login_code' => 'global-answer',
        ]);
        $template = (string) str()->uuid();
        DB::table('task_templates')->insert(['id' => $template, 'name' => 'Reusable template']);
        DB::table('courses')->where('id', $target['id'])->update(['task_template_id' => $template]);
        $finalQuestion = (string) str()->uuid();
        DB::table('final_exam_questions')->insert([
            'id' => $finalQuestion, 'branch_code' => 'male', 'question_type' => 'text', 'prompt' => 'Final question',
        ]);

        $this->deleteJson('/api/dashboard/courses/'.$target['id'])->assertNoContent();

        $this->assertDatabaseMissing('courses', ['id' => $target['id']]);
        foreach (['course_questions', 'course_submissions', 'course_attendance', 'satisfaction_questions', 'satisfaction_responses'] as $table) {
            $this->assertDatabaseMissing($table, ['course_id' => $target['id']]);
        }
        foreach ($target['submissions'] as $id) {
            $this->assertDatabaseMissing('course_submission_answers', ['submission_id' => $id]);
        }
        foreach ($target['paths'] as $path) {
            Storage::disk('local')->assertMissing($path);
        }
        $this->assertHistoryExists($other);
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
        $this->assertDatabaseHas('archives', ['id' => $target['archive']]);
        $this->assertDatabaseHas('task_templates', ['id' => $template]);
        $this->assertDatabaseHas('satisfaction_questions', ['id' => $globalQuestion]);
        $this->assertDatabaseHas('final_exam_questions', ['id' => $finalQuestion]);
        $this->deleteJson('/api/dashboard/courses/'.$target['id'])->assertNoContent();
    }

    public static function sharedReferences(): array
    {
        return [
            ['course_questions', 'attachment_path'], ['final_exam_questions', 'attachment_path'],
            ['course_submission_answers', 'file_path'], ['final_exam_submission_answers', 'file_path'],
        ];
    }

    #[DataProvider('sharedReferences')]
    public function test_shared_attachments_remain_available(string $table, string $column): void
    {
        $target = $this->createHistory('course');
        $other = $this->createHistory('course');
        $path = $target['paths'][0];
        if (str_starts_with($table, 'final_exam')) {
            $question = (string) str()->uuid();
            $submission = (string) str()->uuid();
            DB::table('final_exam_questions')->insert([
                'id' => $question, 'branch_code' => 'male', 'question_type' => 'text', 'prompt' => 'Shared attachment',
                'attachment_path' => $table === 'final_exam_questions' ? $path : null,
            ]);
            DB::table('final_exam_submissions')->insert([
                'id' => $submission, 'branch_code' => 'male', 'student_name' => 'Final student', 'login_code' => 'final-shared',
            ]);
            DB::table('final_exam_submission_answers')->insert([
                'id' => (string) str()->uuid(), 'submission_id' => $submission, 'question_id' => $question,
                'file_path' => $table === 'final_exam_submission_answers' ? $path : null,
            ]);
        } else {
            $query = DB::table($table);
            if ($table === 'course_questions') {
                $query->where('course_id', $other['id']);
            } else {
                $query->whereIn('submission_id', $other['submissions']);
            }
            $query->update([$column => $path]);
        }

        app(CourseManagementService::class)->deleteCourse($target['id']);

        Storage::disk('local')->assertExists($path);
        $this->assertDatabaseHas($table, [$column => $path]);
        $this->assertDatabaseMissing('courses', ['id' => $target['id']]);
    }

    public function test_outer_rollback_restores_history_and_does_not_delete_attachments(): void
    {
        $target = $this->createHistory('course');
        try {
            DB::transaction(function () use ($target): void {
                app(CourseManagementService::class)->deleteCourse($target['id']);
                $this->assertDatabaseMissing('courses', ['id' => $target['id']]);
                foreach ($target['paths'] as $path) {
                    Storage::disk('local')->assertExists($path);
                }
                throw new RuntimeException('Rollback deletion');
            });
            $this->fail('The deletion transaction did not roll back.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Rollback deletion', $exception->getMessage());
        }
        $this->assertHistoryExists($target);
        app(CourseManagementService::class)->deleteCourse($target['id']);
        foreach ($target['paths'] as $path) {
            Storage::disk('local')->assertMissing($path);
        }
    }

    public static function deniedRoles(): array
    {
        return [[null, 401], ['student', 403], ['male_manager', 403], ['female_manager', 403]];
    }

    public function test_failure_during_deletion_rolls_back_all_removed_rows_and_keeps_files(): void
    {
        $target = $this->createHistory('course');
        DB::listen(function (QueryExecuted $query): void {
            $courseTable = $query->connection->getQueryGrammar()->wrapTable('courses');
            if (str_starts_with($query->sql, 'delete from '.$courseTable.' ')) {
                throw new RuntimeException('Simulated deletion failure');
            }
        });
        try {
            app(CourseManagementService::class)->deleteCourse($target['id']);
            $this->fail('The simulated deletion failure was not raised.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Simulated deletion failure', $exception->getMessage());
        }
        $this->assertHistoryExists($target);
    }

    public function test_partial_exam_permissions_cannot_delete_a_course_and_its_post_results(): void
    {
        $target = $this->createHistory('course');
        Sanctum::actingAs(User::factory()->create(['role' => 'male_manager']));
        DB::table('role_permissions')->insert([
            'role' => 'male_manager', 'permission_key' => 'edit_pre_questions', 'is_enabled' => true,
        ]);
        $this->deleteJson('/api/dashboard/courses/'.$target['id'])->assertForbidden();
        $this->assertHistoryExists($target);
    }

    #[DataProvider('deniedRoles')]
    public function test_unauthorized_requests_cannot_delete_saved_history(?string $role, int $status): void
    {
        $target = $this->createHistory('course');
        if ($role !== null) {
            Sanctum::actingAs(User::factory()->create(['role' => $role]));
        }
        $this->deleteJson('/api/dashboard/courses/'.$target['id'])->assertStatus($status);
        $this->assertHistoryExists($target);
    }

    #[DataProvider('entities')]
    public function test_manager_with_required_permissions_can_delete_saved_history(string $type, ?string $mode): void
    {
        $target = $this->createHistory($type, $mode);
        Sanctum::actingAs(User::factory()->create(['role' => 'male_manager']));
        foreach ($type === 'task' ? ['edit_tasks'] : ['edit_pre_questions', 'edit_post_questions'] as $permission) {
            DB::table('role_permissions')->insert([
                'role' => 'male_manager', 'permission_key' => $permission, 'is_enabled' => true,
            ]);
        }
        $this->deleteJson('/api/dashboard/courses/'.$target['id'])->assertNoContent();
        $this->assertDatabaseMissing('courses', ['id' => $target['id']]);
    }

    private function createHistory(string $type, ?string $mode = null): array
    {
        $course = (string) str()->uuid();
        $archive = (string) str()->uuid();
        DB::table('archives')->insert(['id' => $archive, 'name' => $archive]);
        DB::table('courses')->insert(['id' => $course, 'title' => 'Deletion fixture', 'entity_type' => $type, 'task_mode' => $mode]);
        $paths = [];
        $submissions = [];
        foreach ($type === 'course' ? ['pre', 'post', 'tasks'] : ['tasks'] as $index => $assessment) {
            $question = (string) str()->uuid();
            $submission = (string) str()->uuid();
            $questionPath = 'assessment-attachments/'.$question.'.pdf';
            $answerPath = 'assessment-attachments/'.$submission.'.pdf';
            $paths = [...$paths, $questionPath, $answerPath];
            foreach ([$questionPath, $answerPath] as $path) {
                Storage::disk('local')->put($path, 'Owned test attachment');
            }
            DB::table('course_questions')->insert([
                'id' => $question, 'course_id' => $course, 'assessment_type' => $assessment,
                'question_type' => 'text', 'prompt' => 'Historical question', 'attachment_path' => $questionPath,
                'deleted_at' => $index === 0 ? now() : null,
            ]);
            DB::table('course_submissions')->insert([
                'id' => $submission, 'course_id' => $course, 'assessment_type' => $assessment,
                'student_name' => 'Deletion student', 'login_code' => $course,
                'archive_id' => $index === 0 ? $archive : null,
                'submission_uniqueness_scope' => $index === 0 ? $archive : 'active', 'manual_score' => 5,
            ]);
            DB::table('course_submission_answers')->insert([
                'id' => (string) str()->uuid(), 'submission_id' => $submission, 'question_id' => $question,
                'answer_text' => 'Saved answer', 'file_path' => $answerPath,
                'archive_id' => $index === 0 ? $archive : null,
            ]);
            $submissions[] = $submission;
        }
        DB::table('course_attendance')->insert([
            'id' => (string) str()->uuid(), 'course_id' => $course, 'student_name' => 'Deletion student',
            'login_code' => $course, 'source' => 'manual',
        ]);
        $survey = (string) str()->uuid();
        DB::table('satisfaction_questions')->insert(['id' => $survey, 'course_id' => $course, 'prompt' => 'Course survey']);
        DB::table('satisfaction_responses')->insert([
            'id' => (string) str()->uuid(), 'course_id' => $course, 'question_id' => $survey,
            'student_name' => 'Deletion student', 'login_code' => $course, 'rating_value' => 5,
        ]);

        return ['id' => $course, 'archive' => $archive, 'submissions' => $submissions, 'paths' => $paths];
    }

    private function assertHistoryExists(array $history): void
    {
        $this->assertDatabaseHas('courses', ['id' => $history['id']]);
        foreach (['course_questions', 'course_submissions', 'course_attendance', 'satisfaction_questions', 'satisfaction_responses'] as $table) {
            $this->assertDatabaseHas($table, ['course_id' => $history['id']]);
        }
        foreach ($history['submissions'] as $id) {
            $this->assertDatabaseHas('course_submission_answers', ['submission_id' => $id, 'answer_text' => 'Saved answer']);
        }
        foreach ($history['paths'] as $path) {
            Storage::disk('local')->assertExists($path);
        }
    }
}
