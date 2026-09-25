<?php

namespace Tests\Feature;

use App\Models\Reciter;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PeopleDirectoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_and_pagination_are_applied_on_the_server(): void
    {
        $this->actAs('admin');
        for ($i = 0; $i < 25; $i++) {
            $this->student('male', sprintf('Teacher %02d', $i), 'teacher-'.$i);
        }
        $female = $this->student('female', 'Teacher other', 'other');
        $this->getJson('/api/dashboard/people?branchCode=male&perPage=10&page=3')->assertOk()
            ->assertJsonCount(5, 'data')->assertJsonPath('total', 25)->assertJsonPath('last_page', 3)
            ->assertJsonMissing(['id' => $female->id]);
        $this->getJson('/api/dashboard/people?branchCode=male&search=teacher-24')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.loginId', 'teacher-24');
        $this->getJson('/api/dashboard/people?search=not-found')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/dashboard/people?perPage=101')->assertUnprocessable();
    }

    public function test_managers_cannot_search_or_page_through_the_other_branch(): void
    {
        $this->actAs('male_manager');
        $female = $this->student('female', 'Hidden', 'hidden');
        $this->getJson('/api/dashboard/people?search=hidden')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/dashboard/people?branchCode=female')->assertForbidden();
        $this->getJson('/api/dashboard/people?branchCode=female&type=reciter')->assertForbidden();
        $this->getJson('/api/dashboard/people')->assertJsonMissing(['id' => $female->id]);
    }

    public function test_directory_requires_the_page_permission(): void
    {
        $this->actAs('male_manager', false);
        $this->getJson('/api/dashboard/people')->assertForbidden();
        $this->actAs('student');
        $this->getJson('/api/dashboard/people')->assertForbidden();
    }

    public function test_reciters_are_searchable_without_exposing_account_credentials(): void
    {
        $this->actAs('admin');
        $student = $this->student('male', 'Linked student', 'linked');
        $account = User::factory()->create(['role' => 'reciter', 'login_code' => 'reader77']);
        $reciter = Reciter::query()->create([
            'full_name' => 'Reader', 'user_id' => $account->id, 'branch_id' => $student->branch_id,
        ]);
        $reciter->students()->attach($student->id);
        $response = $this->getJson('/api/dashboard/people?type=reciter&search=reader77')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.linkedStudentNames', 'Linked student');
        $this->assertArrayNotHasKey('password', $response->json('data.0'));
        $this->assertArrayNotHasKey('user', $response->json('data.0'));
    }

    public function test_progress_is_calculated_before_pagination_and_sorting(): void
    {
        $this->actAs('admin');
        $low = $this->student('male', 'A first by name', 'low');
        $high = $this->student('male', 'Z last by name', 'high');
        $course = (string) str()->uuid();
        DB::table('courses')->insert(['id' => $course, 'title' => 'Course', 'entity_type' => 'course', 'created_at' => now()]);
        DB::table('course_attendance')->insert([
            'id' => (string) str()->uuid(), 'course_id' => $course, 'student_id' => $high->id,
            'student_name' => $high->full_name, 'login_code' => $high->login_code, 'created_at' => now(),
        ]);
        foreach (['pre', 'post'] as $type) {
            DB::table('course_submissions')->insert([
                'id' => (string) str()->uuid(), 'course_id' => $course, 'assessment_type' => $type,
                'student_id' => $high->id, 'student_name' => $high->full_name,
                'login_code' => $high->login_code, 'submitted_at' => now(),
            ]);
        }
        $this->getJson('/api/dashboard/people?sort=highest-progress&perPage=1')->assertOk()
            ->assertJsonPath('total', 2)->assertJsonPath('data.0.id', $high->id)
            ->assertJsonPath('data.0.overallProgress', 60)->assertJsonPath('data.0.metrics.1.display', '100%');
        $this->getJson('/api/dashboard/people?sort=lowest-progress&perPage=1')->assertOk()
            ->assertJsonPath('data.0.id', $low->id)->assertJsonPath('data.0.overallProgress', 0);

        // Same combination formerly calculated in the browser: 10, 100, 100, 100, 100 => 82%.
        foreach ([1, 2, 3] as $part) {
            DB::table('student_parts')->insert(['student_id' => $high->id, 'part_number' => $part]);
        }
        $task = (string) str()->uuid();
        DB::table('courses')->insert(['id' => $task, 'title' => 'Task', 'entity_type' => 'task', 'created_at' => now()]);
        DB::table('course_submissions')->insert([
            'id' => (string) str()->uuid(), 'course_id' => $task, 'assessment_type' => 'tasks', 'task_review_status' => 'approved',
            'student_id' => $high->id, 'student_name' => $high->full_name, 'login_code' => $high->login_code, 'submitted_at' => now(),
        ]);
        $this->getJson('/api/dashboard/people?sort=highest-progress&perPage=1')->assertOk()
            ->assertJsonPath('data.0.overallProgress', 82)->assertJsonPath('data.0.metrics.0.display', '10%');
    }

    private function actAs(string $role, bool $allowed = true): void
    {
        DB::table('role_permissions')->updateOrInsert(['role' => $role, 'permission_key' => 'page_users'], ['is_enabled' => $allowed]);
        Sanctum::actingAs(User::factory()->create(['role' => $role]));
    }

    private function student(string $branch, string $name, string $login): Student
    {
        return Student::query()->create([
            'full_name' => $name, 'login_code' => $login, 'note' => '',
            'branch_id' => DB::table('branches')->where('code', $branch)->value('id'),
        ]);
    }
}
