<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardTaskIndicatorsTest extends TestCase
{
    use RefreshDatabase;

    public function test_closed_tasks_keep_unique_submissions_in_their_branch_indicator(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $male = $this->student('male', 'male-1');
        $this->student('male', 'male-2');
        $female = $this->student('female', 'female-1');
        $closed = $this->task(false);
        $unopened = $this->task(false);
        $this->submission($closed, $male);
        $this->submission($closed, $male, ['submission_uniqueness_scope' => 'legacy-duplicate']);
        // A response from an unrelated account cannot make an unopened task eligible.
        $this->submission($unopened, $female, ['login_code' => 'unrelated']);

        $this->getJson('/api/dashboard/shell')->assertOk()
            ->assertJsonPath('overviewIndicators.male.4.meta', '1 من 2')
            ->assertJsonPath('overviewIndicators.male.4.display', '50%')
            ->assertJsonPath('overviewIndicators.female.4.meta', '0 من 0')
            ->assertJsonPath('overviewIndicators.all.4.meta', '1 من 2');

        $open = $this->task(true);
        $this->submission($open, $female);
        $this->getJson('/api/dashboard/shell')->assertOk()
            ->assertJsonPath('overviewIndicators.male.4.meta', '1 من 4')
            ->assertJsonPath('overviewIndicators.female.4.meta', '1 من 1')
            ->assertJsonPath('overviewIndicators.all.4.meta', '2 من 5');

        Sanctum::actingAs(User::factory()->create(['role' => 'male_manager']));
        DB::table('role_permissions')->updateOrInsert(
            ['role' => 'male_manager', 'permission_key' => 'page_overview'], ['is_enabled' => true],
        );
        $response = $this->getJson('/api/dashboard/shell?branchCode=female')->assertOk()
            ->assertJsonPath('overviewIndicators.male.4.meta', '1 من 4');
        $this->assertSame(['male'], array_keys($response->json('overviewIndicators')));
    }

    public function test_archived_tasks_students_and_responses_do_not_restore_task_eligibility(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $student = $this->student('male', 'male-1');
        $archivedStudent = $this->student('male', 'archived');
        $archive = (string) str()->uuid();
        DB::table('archives')->insert(['id' => $archive, 'name' => 'Archive']);
        $archivedStudent->update(['archive_id' => $archive]);
        $archivedTask = $this->task(false);
        DB::table('courses')->where('id', $archivedTask)->update(['archive_id' => $archive]);
        $this->submission($archivedTask, $student);
        $this->submission($this->task(false), $student, ['archive_id' => $archive]);
        $this->submission($this->task(false), $archivedStudent);

        $this->getJson('/api/dashboard/shell')->assertOk()
            ->assertJsonPath('overviewIndicators.male.4.meta', '0 من 0')
            ->assertJsonPath('overviewIndicators.all.4.display', '0%');
    }

    private function task(bool $open): string
    {
        $id = (string) str()->uuid();
        DB::table('courses')->insert(['id' => $id, 'title' => 'Task', 'entity_type' => 'task',
            'is_tasks_enabled' => $open, 'male_tasks_enabled' => $open, 'female_tasks_enabled' => $open]);

        return $id;
    }

    private function student(string $branch, string $login): Student
    {
        return Student::query()->create(['full_name' => 'Test', 'login_code' => $login,
            'branch_id' => DB::table('branches')->where('code', $branch)->value('id')]);
    }

    private function submission(string $course, Student $student, array $extra = []): void
    {
        DB::table('course_submissions')->insert(array_merge([
            'id' => (string) str()->uuid(), 'course_id' => $course, 'assessment_type' => 'tasks',
            'student_id' => $student->id, 'student_name' => $student->full_name,
            'login_code' => $student->login_code, 'submitted_at' => now(),
        ], $extra));
    }
}
