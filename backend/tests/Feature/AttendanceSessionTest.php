<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Student;
use App\Models\User;
use App\Support\DepartmentContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AttendanceSessionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $user;

    private Student $student;

    private string $course;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->user = User::factory()->create(['role' => 'student']);
        $this->student = Student::query()->create(['full_name' => 'طالب التحضير', 'login_code' => $this->user->login_code,
            'branch_id' => DB::table('branches')->where('code', 'male')->value('id'), 'note' => '']);
        $this->course = (string) str()->uuid();
        DB::table('courses')->insert(['id' => $this->course, 'title' => 'دورة التحضير',
            'department_id' => DepartmentContext::id(), 'created_at' => now()]);
        $this->enroll($this->course, $this->student->id);
        Sanctum::actingAs($this->admin);
    }

    private function enroll(string $courseId, string $studentId): void
    {
        DB::table('course_enrollments')->insert(['id' => (string) str()->uuid(), 'department_id' => DepartmentContext::id(),
            'course_id' => $courseId, 'student_id' => $studentId, 'created_at' => now()]);
    }

    private function settings(bool $enabled = true): void
    {
        Sanctum::actingAs($this->admin);
        $this->putJson('/api/dashboard/attendance/settings', ['enabled' => $enabled,
            'mapsUrl' => 'https://www.google.com/maps?q=24.7136,46.6753', 'radius' => 300])->assertOk();
    }

    private function open(float $hours = 2.5): array
    {
        Sanctum::actingAs($this->admin);

        return $this->postJson("/api/dashboard/courses/{$this->course}/attendance-sessions", ['hours' => $hours])
            ->assertCreated()->json();
    }

    private function path(array $session): string
    {
        return "/api/students/me/attendance/{$this->course}/{$session['id']}";
    }

    private function position(array $session): array
    {
        return ['latitude' => 24.7136, 'longitude' => 46.6753, 'accuracy' => 10,
            'timestamp' => now()->getTimestampMs(),
            'challenge' => $this->postJson($this->path($session).'/challenge')->assertOk()->json('challenge')];
    }

    public function test_settings_defaults_extraction_permissions_and_invalid_maps(): void
    {
        $this->getJson('/api/dashboard/attendance/settings')->assertOk()->assertJson(['enabled' => false, 'radius' => 300]);
        Http::fake(['https://maps.app.goo.gl/attendance' => Http::response('', 302,
            ['Location' => 'https://www.google.com/maps/place/test/@24,46,10z/data=!3d24.7136!4d46.6753'])]);
        $this->putJson('/api/dashboard/attendance/settings', ['enabled' => true, 'radius' => 450,
            'mapsUrl' => 'https://maps.app.goo.gl/attendance'])->assertOk()->assertJson(['latitude' => 24.7136, 'longitude' => 46.6753]);
        foreach (['https://example.com/maps?q=24,46', 'https://google.com.evil.test/?q=24,46',
            'http://www.google.com/maps?q=24,46', 'https://www.google.com/maps?q=200,46', ''] as $url) {
            $this->putJson('/api/dashboard/attendance/settings', ['enabled' => true, 'radius' => 300, 'mapsUrl' => $url])->assertUnprocessable();
        }
        Sanctum::actingAs($this->user);
        $this->getJson('/api/dashboard/attendance/settings')->assertForbidden();
        $this->putJson('/api/dashboard/attendance/settings', ['enabled' => false, 'mapsUrl' => '', 'radius' => 1])->assertForbidden();
    }

    public function test_open_close_reopen_hours_and_preserved_history(): void
    {
        $this->settings();
        $session = $this->open();
        $this->postJson("/api/dashboard/courses/{$this->course}/attendance-sessions", ['hours' => 3])->assertUnprocessable();
        Sanctum::actingAs($this->user);
        $this->getJson('/api/students/me/attendance')->assertOk()->assertJsonCount(1)->assertJsonPath('0.hours', 2.5);
        $this->postJson($this->path($session), $this->position($session))->assertNoContent();
        $this->postJson($this->path($session), $this->position($session))->assertUnprocessable();
        $this->assertDatabaseHas('course_attendance', ['student_id' => $this->student->id, 'course_id' => $this->course,
            'session_id' => $session['id'], 'hours' => 2.5, 'source' => 'student']);
        Sanctum::actingAs($this->admin);
        $this->postJson("/api/dashboard/courses/{$this->course}/attendance-sessions/{$session['id']}/close")->assertNoContent();
        $next = $this->open(1.25);
        Sanctum::actingAs($this->user);
        $this->postJson($this->path($session).'/challenge')->assertUnprocessable();
        $this->postJson($this->path($next), $this->position($next))->assertNoContent();
        $this->assertDatabaseCount('course_attendance', 2);
        $this->assertEquals(3.75, DB::table('course_attendance')->sum('hours'));
        $this->getJson('/api/dashboard/snapshot')->assertOk()->assertJsonFragment(['sessionId' => $next['id'], 'hours' => 1.25]);
    }

    public function test_disabled_self_attendance_hides_sessions_and_rejects_existing_challenge(): void
    {
        $this->settings();
        $session = $this->open();
        Sanctum::actingAs($this->user);
        $data = $this->position($session);
        $this->settings(false);
        Sanctum::actingAs($this->user);
        $this->getJson('/api/students/me/attendance')->assertOk()->assertExactJson([]);
        $this->postJson($this->path($session), $data)->assertForbidden();
        $this->postJson($this->path($session).'/challenge')->assertForbidden();
        $this->assertDatabaseCount('course_attendance', 0);
    }

    public function test_location_accuracy_age_distance_challenge_and_required_fields(): void
    {
        $this->settings();
        $session = $this->open();
        Sanctum::actingAs($this->user);
        $data = $this->position($session);
        foreach ([['latitude' => 25], ['accuracy' => 101], ['accuracy' => 0], ['longitude' => 181],
            ['timestamp' => now()->subMinute()->getTimestampMs()], ['timestamp' => now()->addMinute()->getTimestampMs()],
            ['challenge' => 'forged']] as $override) {
            $this->postJson($this->path($session), [...$data, ...$override])->assertUnprocessable();
        }
        $this->postJson($this->path($session), [])->assertUnprocessable();
        $this->travel(61)->seconds();
        $this->postJson($this->path($session), [...$data, 'timestamp' => now()->getTimestampMs()])->assertUnprocessable();
        $this->travelBack();
        $this->assertDatabaseCount('course_attendance', 0);
        $this->postJson($this->path($session), $this->position($session))->assertNoContent();
    }

    public function test_closed_session_rejects_a_previously_issued_challenge(): void
    {
        $this->settings();
        $session = $this->open();
        Sanctum::actingAs($this->user);
        $data = $this->position($session);
        Sanctum::actingAs($this->admin);
        $this->postJson("/api/dashboard/courses/{$this->course}/attendance-sessions/{$session['id']}/close")->assertNoContent();
        Sanctum::actingAs($this->user);
        $this->postJson($this->path($session), $data)->assertUnprocessable();
        $this->getJson('/api/students/me/attendance')->assertExactJson([]);
    }

    public function test_enrollment_role_course_and_department_are_enforced(): void
    {
        $this->settings();
        $session = $this->open();
        Sanctum::actingAs($this->user);
        $data = $this->position($session);
        Sanctum::actingAs(User::factory()->create(['role' => 'student']));
        $this->getJson('/api/students/me/attendance')->assertForbidden();
        $this->postJson($this->path($session), $data)->assertForbidden();
        Sanctum::actingAs($this->user);
        $this->postJson("/api/dashboard/courses/{$this->course}/attendance-sessions", ['hours' => 1])->assertForbidden();
        $archiveId = (string) str()->uuid();
        DB::table('archives')->insert(['id' => $archiveId, 'name' => 'أرشيف', 'created_at' => now()]);
        DB::table('students')->where('id', $this->student->id)->update(['archive_id' => $archiveId]);
        $this->postJson($this->path($session), $data)->assertForbidden();
    }

    public function test_manager_permission_and_supervision_cross_method_deduplication(): void
    {
        $this->settings();
        $session = $this->open();
        $manager = User::factory()->create(['role' => 'male_manager']);
        Sanctum::actingAs($manager);
        DB::table('role_permissions')->updateOrInsert(['department_id' => DepartmentContext::id(), 'role' => 'male_manager',
            'permission_key' => 'page_results'], ['is_enabled' => false]);
        // Supervisor permissions are automatic in the current application; legacy flags cannot revoke them.
        $this->getJson("/api/dashboard/courses/{$this->course}/attendance-sessions")->assertOk();
        DB::table('role_permissions')->where('role', 'male_manager')->where('permission_key', 'page_results')->update(['is_enabled' => true]);
        $this->getJson("/api/dashboard/courses/{$this->course}/attendance-sessions")->assertOk();
        $payload = ['courseId' => $this->course, 'sessionId' => $session['id'], 'presentStudents' => [
            ['loginId' => $this->student->login_code, 'studentName' => 'forged']]];
        $this->postJson('/api/dashboard/manual-attendance', $payload)->assertNoContent();
        $this->postJson('/api/dashboard/manual-attendance', $payload)->assertNoContent();
        Sanctum::actingAs($this->user);
        $this->postJson($this->path($session), $this->position($session))->assertUnprocessable();
        $this->assertDatabaseCount('course_attendance', 1);
        $this->settings(false);
        $this->postJson('/api/dashboard/manual-attendance', $payload)->assertNoContent();
        $this->postJson('/api/dashboard/manual-attendance', ['courseId' => $this->course, 'presentStudents' => []])->assertUnprocessable();
        $this->assertDatabaseHas('course_attendance', ['hours' => 2.5, 'source' => 'manual', 'student_name' => $this->student->full_name]);
    }

    public function test_supervision_preserves_self_attendance_and_closed_history(): void
    {
        $this->settings();
        $session = $this->open();
        Sanctum::actingAs($this->user);
        $this->postJson($this->path($session), $this->position($session))->assertNoContent();
        Sanctum::actingAs($this->admin);
        $payload = ['courseId' => $this->course, 'sessionId' => $session['id'], 'presentStudents' => []];
        $this->postJson('/api/dashboard/manual-attendance', $payload)->assertNoContent();
        $this->postJson('/api/dashboard/manual-attendance', [...$payload, 'presentStudents' => [
            ['loginId' => $this->student->login_code, 'studentName' => 'forged']]])->assertNoContent();
        $this->assertDatabaseCount('course_attendance', 1);
        $this->postJson("/api/dashboard/courses/{$this->course}/attendance-sessions/{$session['id']}/close")->assertNoContent();
        $this->postJson('/api/dashboard/manual-attendance', $payload)->assertUnprocessable();
        $this->assertDatabaseHas('course_attendance', ['source' => 'student']);
    }

    public function test_other_department_task_missing_course_and_other_students_challenge_are_rejected(): void
    {
        $this->settings();
        $session = $this->open();
        Sanctum::actingAs($this->user);
        $data = $this->position($session);
        $second = User::factory()->create(['role' => 'student']);
        Student::query()->create(['full_name' => 'طالب آخر', 'login_code' => $second->login_code,
            'branch_id' => $this->student->branch_id, 'note' => '']);
        $this->enroll($this->course, Student::query()->where('login_code', $second->login_code)->value('id'));
        Sanctum::actingAs($second);
        $this->postJson($this->path($session), $data)->assertUnprocessable();
        $department = Department::create(['name' => 'إدارة ثانية', 'is_active' => true]);
        DB::table('courses')->where('id', $this->course)->update(['department_id' => $department->id]);
        $this->postJson($this->path($session).'/challenge')->assertNotFound();
        $this->getJson('/api/students/me/attendance')->assertExactJson([]);
        Sanctum::actingAs($this->admin);
        $this->getJson("/api/dashboard/courses/{$this->course}/attendance-sessions")->assertNotFound();
        DB::table('courses')->where('id', $this->course)->update(['department_id' => DepartmentContext::DEFAULT_ID, 'entity_type' => 'task']);
        $this->postJson("/api/dashboard/courses/{$this->course}/attendance-sessions", ['hours' => 1])->assertNotFound();
        foreach ([0, -1, 1.001, 10000, 'invalid'] as $hours) {
            $this->postJson('/api/dashboard/courses/missing/attendance-sessions', ['hours' => $hours])->assertUnprocessable();
        }
    }

    public function test_multiple_enrolled_courses_and_hours_do_not_inflate_completion(): void
    {
        $this->settings();
        $first = $this->open();
        $otherCourse = (string) str()->uuid();
        DB::table('courses')->insert(['id' => $otherCourse, 'title' => 'دورة ثانية',
            'department_id' => DepartmentContext::id(), 'created_at' => now()]);
        $this->enroll($otherCourse, $this->student->id);
        $this->postJson("/api/dashboard/courses/{$otherCourse}/attendance-sessions", ['hours' => 1])->assertCreated();
        Sanctum::actingAs($this->user);
        $this->getJson('/api/students/me/attendance')->assertJsonCount(2);
        $this->postJson($this->path($first), $this->position($first))->assertNoContent();
        Sanctum::actingAs($this->admin);
        $this->postJson("/api/dashboard/courses/{$this->course}/attendance-sessions/{$first['id']}/close")->assertNoContent();
        $next = $this->open(1);
        Sanctum::actingAs($this->user);
        $this->postJson($this->path($next), $this->position($next))->assertNoContent();
        $this->getJson('/api/students/me/indicators')->assertOk()->assertJsonPath('student.details.attendance.current', 1);
    }

    public function test_archiving_preserves_matching_session_course_and_hours(): void
    {
        $this->settings();
        $session = $this->open();
        Sanctum::actingAs($this->user);
        $this->postJson($this->path($session), $this->position($session))->assertNoContent();
        Sanctum::actingAs($this->admin);
        $archive = $this->postJson('/api/dashboard/archives/archive-all', ['name' => 'أرشيف التحضير', 'batch_type' => 'all'])
            ->assertOk()->json('archive.id');
        $record = DB::table('course_attendance')->where('archive_id', $archive)->first();
        $copy = DB::table('attendance_sessions')->where('id', $record->session_id)->first();
        $this->assertEquals($record->course_id, $copy->course_id);
        $this->assertDatabaseHas('course_enrollments', ['course_id' => $copy->course_id, 'student_id' => $this->student->id]);
        $this->assertDatabaseMissing('course_enrollments', ['course_id' => $this->course, 'student_id' => $this->student->id]);
        $this->assertEquals(2.5, $record->hours);
        $this->assertNull($copy->active);
        $this->assertDatabaseHas('attendance_sessions', ['id' => $session['id'], 'active' => null]);
        $this->deleteJson("/api/dashboard/archives/{$archive}")->assertOk();
        $this->assertDatabaseMissing('attendance_sessions', ['id' => $copy->id]);
    }

    public function test_course_deletion_cleans_its_sessions_and_attendance(): void
    {
        $this->settings();
        $session = $this->open();
        Sanctum::actingAs($this->user);
        $this->postJson($this->path($session), $this->position($session))->assertNoContent();
        Sanctum::actingAs($this->admin);
        $this->deleteJson("/api/dashboard/courses/{$this->course}")->assertNoContent();
        $this->assertDatabaseMissing('attendance_sessions', ['id' => $session['id']]);
        $this->assertDatabaseCount('course_attendance', 0);
    }
}
