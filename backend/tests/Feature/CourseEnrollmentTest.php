<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Student;
use App\Models\User;
use App\Support\DepartmentContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CourseEnrollmentTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $user;

    private Student $student;

    private Student $female;

    private string $course;

    private string $other;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->user = User::factory()->create(['role' => 'student']);
        $this->student = Student::query()->create(['full_name' => 'طالب الدورة', 'login_code' => $this->user->login_code,
            'branch_id' => DB::table('branches')->where('code', 'male')->value('id'), 'note' => '']);
        $this->female = Student::query()->create(['full_name' => 'طالبة الدورة', 'login_code' => 'enrollment-female',
            'branch_id' => DB::table('branches')->where('code', 'female')->value('id'), 'note' => '']);
        foreach (['course', 'other'] as $property) {
            $this->{$property} = (string) str()->uuid();
            DB::table('courses')->insert(['id' => $this->{$property}, 'title' => $property,
                'department_id' => DepartmentContext::id(), 'created_at' => now()]);
        }
        Sanctum::actingAs($this->admin);
        $this->putJson('/api/dashboard/attendance/settings', ['enabled' => true,
            'mapsUrl' => 'https://www.google.com/maps?q=24.7136,46.6753', 'radius' => 300])->assertOk();
    }

    private function enroll(string $course, array $ids, string $branch = 'male'): void
    {
        $this->putJson("/api/dashboard/courses/{$course}/enrollments", ['branchCode' => $branch, 'studentIds' => $ids])->assertOk();
    }

    private function open(string $course): string
    {
        return $this->postJson("/api/dashboard/courses/{$course}/attendance-sessions", ['hours' => 2.5])->assertCreated()->json('id');
    }

    private function path(string $course, string $session): string
    {
        return "/api/students/me/attendance/{$course}/{$session}";
    }

    private function position(string $course, string $session): array
    {
        return ['challenge' => $this->postJson($this->path($course, $session).'/challenge')->assertOk()->json('challenge'),
            'latitude' => 24.7136, 'longitude' => 46.6753, 'accuracy' => 10, 'timestamp' => now()->getTimestampMs()];
    }

    private function manual(string $session, bool $present = true, array $removed = []): array
    {
        return ['courseId' => $this->course, 'sessionId' => $session, 'branchCode' => 'male',
            'presentStudents' => $present ? [['loginId' => $this->student->login_code, 'studentName' => 'forged']] : [],
            'removedStudents' => $removed];
    }

    public function test_program_registration_never_grants_implicit_course_registration(): void
    {
        $session = $this->open($this->course);
        Sanctum::actingAs($this->user);
        $this->getJson('/api/students/me/attendance')->assertExactJson([]);
        $this->postJson($this->path($this->course, $session).'/challenge')->assertForbidden();
        $this->postJson($this->path($this->course, $session), ['challenge' => 'forged',
            'latitude' => 24.7136, 'longitude' => 46.6753, 'accuracy' => 10, 'timestamp' => now()->getTimestampMs()])->assertForbidden();
        $this->putJson("/api/dashboard/courses/{$this->course}/enrollments", ['branchCode' => 'male', 'studentIds' => [$this->student->id]])->assertForbidden();
        $this->assertDatabaseCount('course_enrollments', 0);
        $this->assertDatabaseCount('course_attendance', 0);
    }

    public function test_opening_one_course_never_opens_another_and_only_explicit_enrollments_are_available(): void
    {
        $this->enroll($this->course, [$this->student->id]);
        $first = $this->open($this->course);
        $this->assertDatabaseMissing('attendance_sessions', ['course_id' => $this->other]);
        $second = $this->open($this->other);
        Sanctum::actingAs($this->user);
        $this->getJson('/api/students/me/attendance')->assertJsonCount(1)->assertJsonPath('0.courseId', $this->course);
        $this->postJson($this->path($this->other, $second).'/challenge')->assertForbidden();
        Sanctum::actingAs($this->admin);
        $this->enroll($this->other, [$this->student->id]);
        Sanctum::actingAs($this->user);
        $this->getJson('/api/students/me/attendance')->assertJsonCount(2);
        $this->postJson($this->path($this->other, $first).'/challenge')->assertUnprocessable();
        $this->postJson($this->path($this->course, $first), $this->position($this->course, $first))->assertNoContent();
        $this->assertDatabaseMissing('course_attendance', ['course_id' => $this->other]);
    }

    public function test_repeated_roster_saves_are_idempotent_and_each_branch_is_isolated(): void
    {
        $this->enroll($this->course, [$this->female->id], 'female');
        Sanctum::actingAs(User::factory()->create(['role' => 'male_manager']));
        $this->enroll($this->course, [$this->student->id]);
        $this->enroll($this->course, [$this->student->id]);
        $this->assertDatabaseCount('course_enrollments', 2);
        $this->getJson("/api/dashboard/courses/{$this->course}/enrollments?branchCode=male")->assertExactJson(['studentIds' => [$this->student->id]]);
        $this->getJson("/api/dashboard/courses/{$this->course}/enrollments?branchCode=female")->assertForbidden();
        $this->putJson("/api/dashboard/courses/{$this->course}/enrollments", ['branchCode' => 'female', 'studentIds' => []])->assertForbidden();
        $this->putJson("/api/dashboard/courses/{$this->course}/enrollments", ['branchCode' => 'male', 'studentIds' => [$this->female->id]])->assertUnprocessable();
        $this->enroll($this->course, []);
        $this->assertDatabaseCount('course_enrollments', 1);
        $this->assertDatabaseHas('course_enrollments', ['student_id' => $this->female->id]);
    }

    public function test_foreign_department_invalid_and_duplicate_students_do_not_replace_the_roster(): void
    {
        $this->enroll($this->course, [$this->student->id]);
        $foreign = Department::create(['name' => 'إدارة أخرى', 'is_active' => true]);
        $outsider = DepartmentContext::run($foreign->id, fn () => Student::query()->create([
            'full_name' => 'طالب إدارة أخرى', 'login_code' => 'foreign-enrollment', 'branch_id' => $this->student->branch_id, 'note' => '']));
        foreach ([[$outsider->id], [(string) str()->uuid()], [$this->student->id, $this->student->id]] as $ids) {
            $this->putJson("/api/dashboard/courses/{$this->course}/enrollments", ['branchCode' => 'male', 'studentIds' => $ids])->assertUnprocessable();
        }
        $this->assertDatabaseCount('course_enrollments', 1);
        DB::table('courses')->where('id', $this->other)->update(['department_id' => $foreign->id]);
        $this->getJson("/api/dashboard/courses/{$this->other}/enrollments?branchCode=male")->assertNotFound();
        $this->putJson("/api/dashboard/courses/{$this->other}/enrollments", ['branchCode' => 'male', 'studentIds' => []])->assertNotFound();
    }

    public function test_revocation_rejects_an_issued_challenge_and_preserves_previous_hours(): void
    {
        $this->enroll($this->course, [$this->student->id]);
        $first = $this->open($this->course);
        Sanctum::actingAs($this->user);
        $this->postJson($this->path($this->course, $first), $this->position($this->course, $first))->assertNoContent();
        Sanctum::actingAs($this->admin);
        $this->postJson("/api/dashboard/courses/{$this->course}/attendance-sessions/{$first}/close")->assertNoContent();
        $second = $this->open($this->course);
        Sanctum::actingAs($this->user);
        $data = $this->position($this->course, $second);
        Sanctum::actingAs($this->admin);
        $this->enroll($this->course, []);
        Sanctum::actingAs($this->user);
        $this->getJson('/api/students/me/attendance')->assertExactJson([]);
        $this->postJson($this->path($this->course, $second), $data)->assertForbidden();
        $this->assertDatabaseCount('course_attendance', 1);
        $this->assertDatabaseHas('course_attendance', ['session_id' => $first, 'hours' => 2.5]);
    }

    public function test_supervisor_can_cancel_and_reapply_both_methods_without_duplicates_or_location(): void
    {
        $this->enroll($this->course, [$this->student->id]);
        $session = $this->open($this->course);
        Sanctum::actingAs($this->user);
        $this->postJson($this->path($this->course, $session), $this->position($this->course, $session))->assertNoContent();
        Sanctum::actingAs(User::factory()->create(['role' => 'male_manager']));
        $this->postJson('/api/dashboard/manual-attendance', $this->manual($session, false))->assertNoContent();
        $this->assertDatabaseCount('course_attendance', 1); // A stale unchecked list is not an explicit cancellation.
        $this->postJson('/api/dashboard/manual-attendance', $this->manual($session, false, [$this->student->login_code]))->assertNoContent();
        $this->assertDatabaseCount('course_attendance', 0);
        foreach ([1, 2] as $attempt) {
            $this->postJson('/api/dashboard/manual-attendance', $this->manual($session))->assertNoContent();
            $this->assertDatabaseCount('course_attendance', 1);
        }
        Sanctum::actingAs($this->user);
        $this->postJson($this->path($this->course, $session), $this->position($this->course, $session))->assertUnprocessable();
        Sanctum::actingAs($this->admin);
        $this->putJson('/api/dashboard/attendance/settings', ['enabled' => false,
            'mapsUrl' => 'https://www.google.com/maps?q=24.7136,46.6753', 'radius' => 300])->assertOk();
        $this->postJson('/api/dashboard/manual-attendance', $this->manual($session, false, [$this->student->login_code]))->assertNoContent();
        $this->postJson('/api/dashboard/manual-attendance', $this->manual($session))->assertNoContent();
        $this->assertDatabaseHas('course_attendance', ['hours' => 2.5, 'source' => 'manual']);
        $this->postJson("/api/dashboard/courses/{$this->course}/attendance-sessions/{$session}/close")->assertNoContent();
        $this->postJson('/api/dashboard/manual-attendance', $this->manual($session, false, [$this->student->login_code]))->assertUnprocessable();
        $this->assertDatabaseCount('course_attendance', 1);
    }

    public function test_supervisor_cannot_enroll_implicitly_or_cancel_another_branch_or_another_session(): void
    {
        $session = $this->open($this->course);
        $this->postJson('/api/dashboard/manual-attendance', $this->manual($session))->assertForbidden();
        $this->assertDatabaseCount('course_enrollments', 0);
        $this->enroll($this->course, [$this->female->id], 'female');
        $this->postJson('/api/dashboard/manual-attendance', ['courseId' => $this->course, 'sessionId' => $session, 'branchCode' => 'female',
            'presentStudents' => [['loginId' => $this->female->login_code, 'studentName' => 'Female']]])->assertNoContent();
        Sanctum::actingAs(User::factory()->create(['role' => 'male_manager']));
        $this->postJson('/api/dashboard/manual-attendance', $this->manual($session, false, [$this->female->login_code]))->assertForbidden();
        $this->postJson('/api/dashboard/manual-attendance', $this->manual((string) str()->uuid(), false))->assertUnprocessable();
        $this->assertDatabaseCount('course_attendance', 1);
    }
}
