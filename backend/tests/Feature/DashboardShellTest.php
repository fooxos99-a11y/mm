<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardShellTest extends TestCase
{
    use RefreshDatabase;

    public function test_shell_counts_all_students_without_sending_personal_records(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $branch = DB::table('branches')->where('code', 'male')->value('id');
        $rows = [];
        for ($i = 0; $i < 1001; $i++) {
            $rows[] = ['id' => (string) str()->uuid(), 'branch_id' => $branch, 'full_name' => 'Private name', 'login_code' => 'login-'.$i];
        }
        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('students')->insert($chunk);
        }
        $response = $this->getJson('/api/dashboard/shell')->assertOk()
            ->assertJsonPath('snapshotMode', 'shell')
            ->assertJsonPath('overviewIndicators.male.0.meta', '0 من 30030')
            ->assertJsonPath('overviewIndicators.all.5.meta', '0 من 1001');
        foreach (['students', 'reciters', 'submissions', 'courses'] as $key) {
            $this->assertArrayNotHasKey($key, $response->json());
        }
        $this->assertLessThan(6000, strlen($response->getContent()));
    }

    public function test_indicators_respect_branch_eligibility_and_count_unique_slots(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $male = $this->student('male');
        $female = $this->student('female');
        DB::table('student_parts')->insert(['student_id' => $male->id, 'part_number' => 1]);
        $female->update(['is_certified' => true]);
        $course = (string) str()->uuid();
        DB::table('courses')->insert(['id' => $course, 'title' => 'Course', 'entity_type' => 'course',
            'female_pre_enabled' => false, 'is_post_enabled' => false]);
        $task = (string) str()->uuid();
        DB::table('courses')->insert(['id' => $task, 'title' => 'Task', 'entity_type' => 'task']);
        foreach ([$male, $female] as $student) {
            foreach (['pre', 'post', 'tasks'] as $type) {
                DB::table('course_submissions')->insert([
                    'id' => (string) str()->uuid(), 'course_id' => $type === 'tasks' ? $task : $course,
                    'assessment_type' => $type, 'student_id' => $student->id,
                    'student_name' => $student->full_name, 'login_code' => $student->login_code,
                    'submitted_at' => now(),
                ]);
            }
            DB::table('course_attendance')->insert(['id' => (string) str()->uuid(), 'course_id' => $course,
                'student_id' => $student->id, 'student_name' => $student->full_name, 'login_code' => $student->login_code]);
        }
        $this->getJson('/api/dashboard/shell')->assertOk()
            ->assertJsonPath('overviewIndicators.all.0.meta', '1 من 40')
            ->assertJsonPath('overviewIndicators.all.1.meta', '2 من 2')
            ->assertJsonPath('overviewIndicators.all.2.meta', '1 من 1')
            ->assertJsonPath('overviewIndicators.all.3.meta', '0 من 0')
            ->assertJsonPath('overviewIndicators.all.4.meta', '2 من 2')
            ->assertJsonPath('overviewIndicators.all.5.meta', '1 من 2');
    }

    public function test_managers_only_receive_their_branch_and_overview_requires_permission(): void
    {
        $this->student('female');
        Sanctum::actingAs(User::factory()->create(['role' => 'male_manager']));
        DB::table('role_permissions')->updateOrInsert(['role' => 'male_manager', 'permission_key' => 'page_overview'], ['is_enabled' => true]);
        $response = $this->getJson('/api/dashboard/shell?branchCode=female')->assertOk()
            ->assertJsonPath('overviewIndicators.male.5.meta', '0 من 0')->assertJsonCount(1, 'branches');
        $this->assertSame(['male'], array_keys($response->json('overviewIndicators')));
        DB::table('role_permissions')->where('role', 'male_manager')->where('permission_key', 'page_overview')->update(['is_enabled' => false]);
        $this->getJson('/api/dashboard/shell')->assertOk()->assertJsonCount(0, 'overviewIndicators');
        Sanctum::actingAs(User::factory()->create(['role' => 'student']));
        $this->getJson('/api/dashboard/shell')->assertForbidden();
    }

    private function student(string $branch): Student
    {
        return Student::query()->create(['full_name' => $branch, 'login_code' => $branch,
            'branch_id' => DB::table('branches')->where('code', $branch)->value('id')]);
    }
}
