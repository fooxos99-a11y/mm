<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ManualAttendanceTest extends TestCase
{
    use RefreshDatabase;

    private string $courseId;

    private array $students;

    protected function setUp(): void
    {
        parent::setUp();
        $this->courseId = (string) str()->uuid();
        DB::table('courses')->insert(['id' => $this->courseId, 'title' => 'Attendance', 'created_at' => now()]);
        foreach (['male', 'female'] as $branch) {
            $student = Student::query()->create([
                'full_name' => $branch.' student', 'login_code' => 'attendance-'.$branch,
                'branch_id' => DB::table('branches')->where('code', $branch)->value('id'), 'note' => '',
            ]);
            $this->students[$branch] = $student;
            DB::table('course_attendance')->insert([
                'id' => (string) str()->uuid(), 'course_id' => $this->courseId,
                'student_id' => $student->id, 'student_name' => $student->full_name,
                'login_code' => $student->login_code, 'source' => 'post-test', 'created_at' => now(),
            ]);
        }
    }

    public static function branches(): array
    {
        return [['male', 'female'], ['female', 'male']];
    }

    #[DataProvider('branches')]
    public function test_manager_can_save_repeatedly_and_clear_only_their_branch(string $branch, string $other): void
    {
        $this->actAs($branch.'_manager');
        $untouched = DB::table('course_attendance')->where('login_code', $this->students[$other]->login_code)->first();
        for ($i = 0; $i < 2; $i++) {
            $this->postJson('/api/dashboard/manual-attendance', $this->payload($branch))->assertNoContent();
            $this->assertDatabaseCount('course_attendance', 2);
        }
        $this->postJson('/api/dashboard/manual-attendance', ['courseId' => $this->courseId, 'presentStudents' => []])
            ->assertNoContent();
        $this->assertDatabaseCount('course_attendance', 1);
        $this->assertDatabaseHas('course_attendance', (array) $untouched);
    }

    public function test_manager_cannot_override_branch_or_submit_other_branch_students(): void
    {
        $this->actAs('male_manager');
        $this->postJson('/api/dashboard/manual-attendance', [...$this->payload('male'), 'branchCode' => 'female'])
            ->assertForbidden();
        $this->postJson('/api/dashboard/manual-attendance', $this->payload('female'))->assertForbidden();
        $this->assertDatabaseCount('course_attendance', 2);
    }

    public function test_admin_can_clear_a_selected_branch_or_explicitly_use_the_legacy_all_branch_request(): void
    {
        $this->actAs('admin');
        $this->postJson('/api/dashboard/manual-attendance', [
            'courseId' => $this->courseId, 'branchCode' => 'male', 'presentStudents' => [],
        ])->assertNoContent();
        $this->assertDatabaseCount('course_attendance', 1);
        $this->assertDatabaseHas('course_attendance', ['login_code' => $this->students['female']->login_code]);
        $this->postJson('/api/dashboard/manual-attendance', [
            'courseId' => $this->courseId, 'presentStudents' => [],
        ])->assertNoContent();
        $this->assertDatabaseCount('course_attendance', 0);
    }

    public function test_student_identity_is_derived_from_the_database(): void
    {
        $this->actAs('male_manager');
        $payload = $this->payload('male');
        $payload['presentStudents'][0]['studentId'] = $this->students['female']->id;
        $payload['presentStudents'][0]['studentName'] = 'Forged';
        $this->postJson('/api/dashboard/manual-attendance', $payload)->assertNoContent();
        $this->assertDatabaseHas('course_attendance', [
            'login_code' => $this->students['male']->login_code,
            'student_id' => $this->students['male']->id,
            'student_name' => $this->students['male']->full_name,
        ]);
    }

    public function test_invalid_or_duplicate_students_do_not_erase_existing_attendance(): void
    {
        $this->actAs('admin');
        $payload = $this->payload('male');
        $payload['presentStudents'][] = $payload['presentStudents'][0];
        $this->postJson('/api/dashboard/manual-attendance', $payload)->assertUnprocessable();
        $payload['presentStudents'] = [['loginId' => 'missing', 'studentName' => 'Missing']];
        $this->postJson('/api/dashboard/manual-attendance', $payload)->assertUnprocessable();
        $this->assertDatabaseCount('course_attendance', 2);
    }

    public function test_missing_course_or_missing_list_does_not_erase_attendance(): void
    {
        $this->actAs('admin');
        $this->postJson('/api/dashboard/manual-attendance', ['courseId' => $this->courseId])->assertUnprocessable();
        $this->postJson('/api/dashboard/manual-attendance', [...$this->payload('male'), 'courseId' => 'missing'])
            ->assertUnprocessable();
        $this->assertDatabaseCount('course_attendance', 2);
    }

    public function test_manager_without_results_permission_cannot_clear_attendance(): void
    {
        $this->actAs('male_manager', false);
        $this->postJson('/api/dashboard/manual-attendance', ['courseId' => $this->courseId, 'presentStudents' => []])
            ->assertForbidden();
        $this->assertDatabaseCount('course_attendance', 2);
    }

    private function actAs(string $role, bool $permitted = true): void
    {
        DB::table('role_permissions')->updateOrInsert(
            ['role' => $role, 'permission_key' => 'page_results'],
            ['is_enabled' => $permitted],
        );
        Sanctum::actingAs(User::factory()->create(['role' => $role]));
    }

    private function payload(string $branch): array
    {
        $student = $this->students[$branch];

        return ['courseId' => $this->courseId, 'presentStudents' => [[
            'loginId' => $student->login_code, 'studentId' => $student->id, 'studentName' => $student->full_name,
        ]]];
    }
}
