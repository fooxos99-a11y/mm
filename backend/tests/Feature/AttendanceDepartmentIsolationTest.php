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

class AttendanceDepartmentIsolationTest extends TestCase
{
    use RefreshDatabase;

    private array $first;

    private array $second;

    protected function setUp(): void
    {
        DepartmentContext::reset();
        parent::setUp();
        $this->first = $this->department('الأولى', 24.7136, 46.6753, 300);
        $this->second = $this->department('الثانية', 21.5433, 39.1728, 700);
    }

    protected function tearDown(): void
    {
        DepartmentContext::reset();
        parent::tearDown();
    }

    private function department(string $name, float $latitude, float $longitude, int $radius): array
    {
        $department = Department::create(['name' => $name, 'is_active' => true]);

        return DepartmentContext::run($department->id, function () use ($department, $latitude, $longitude, $radius): array {
            $admin = User::factory()->create(['role' => 'admin']);
            $user = User::factory()->create(['role' => 'student']);
            $student = Student::query()->create(['full_name' => 'طالب التحضير', 'login_code' => $user->login_code,
                'branch_id' => DB::table('branches')->where('code', 'male')->value('id'), 'note' => '']);
            $course = (string) str()->uuid();
            DB::table('courses')->insert(['id' => $course, 'title' => 'دورة التحضير',
                'department_id' => $department->id, 'created_at' => now()]);

            return ['id' => $department->id, 'admin' => $admin, 'user' => $user, 'student' => $student,
                'course' => $course, 'settings' => ['enabled' => true, 'radius' => $radius,
                    'mapsUrl' => "https://www.google.com/maps?q={$latitude},{$longitude}"],
                'latitude' => $latitude, 'longitude' => $longitude];
        });
    }

    private function save(array $department, bool $enabled): void
    {
        Sanctum::actingAs($department['admin']);
        $this->putJson('/api/dashboard/attendance/settings', [...$department['settings'], 'enabled' => $enabled])
            ->assertOk()->assertJson(['enabled' => $enabled, 'latitude' => $department['latitude'],
                'longitude' => $department['longitude'], 'radius' => $department['settings']['radius']]);
    }

    private function open(array $department): string
    {
        Sanctum::actingAs($department['admin']);
        $this->putJson("/api/dashboard/courses/{$department['course']}/enrollments", [
            'branchCode' => 'male', 'studentIds' => [$department['student']->id]])->assertOk();

        return $this->postJson("/api/dashboard/courses/{$department['course']}/attendance-sessions", ['hours' => 2.5])
            ->assertCreated()->json('id');
    }

    private function path(array $department, string $session): string
    {
        return "/api/students/me/attendance/{$department['course']}/{$session}";
    }

    private function position(array $department, string $session): array
    {
        return ['challenge' => $this->postJson($this->path($department, $session).'/challenge')->assertOk()->json('challenge'),
            'latitude' => $department['latitude'], 'longitude' => $department['longitude'],
            'accuracy' => 10, 'timestamp' => now()->getTimestampMs()];
    }

    public function test_each_department_has_independent_toggle_location_and_radius(): void
    {
        $this->save($this->first, true);
        Sanctum::actingAs($this->second['admin']);
        $this->getJson('/api/dashboard/attendance/settings')->assertExactJson(['enabled' => false, 'mapsUrl' => '', 'radius' => 300]);
        $this->save($this->second, false);
        foreach ([$this->first, $this->second] as $department) {
            Sanctum::actingAs($department['admin']);
            $this->getJson('/api/dashboard/attendance/settings')->assertOk()->assertJson([
                ...$department['settings'], 'enabled' => $department['id'] === $this->first['id'],
                'latitude' => $department['latitude'], 'longitude' => $department['longitude']]);
        }
        $this->save($this->second, true);
        $this->save($this->first, false);
        Sanctum::actingAs($this->second['admin']);
        $this->getJson('/api/dashboard/attendance/settings')->assertOk()->assertJson([
            ...$this->second['settings'], 'latitude' => $this->second['latitude'], 'longitude' => $this->second['longitude']]);
        $this->assertSame(2, DB::table('app_settings')->where('setting_key', 'attendance')->count());
    }

    public function test_location_and_disabling_are_applied_only_to_the_students_own_department(): void
    {
        $this->save($this->first, true);
        $this->save($this->second, true);
        $firstSession = $this->open($this->first);
        $secondSession = $this->open($this->second);
        Sanctum::actingAs($this->first['user']);
        $this->getJson('/api/students/me/attendance')->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $firstSession);
        $firstPosition = $this->position($this->first, $firstSession);
        $this->postJson($this->path($this->first, $firstSession), [...$firstPosition,
            'latitude' => $this->second['latitude'], 'longitude' => $this->second['longitude']])->assertUnprocessable();
        $this->postJson($this->path($this->second, $secondSession).'/challenge')->assertNotFound();
        $this->postJson($this->path($this->first, $firstSession), $firstPosition)->assertNoContent();

        Sanctum::actingAs($this->second['user']);
        $this->getJson('/api/students/me/attendance')->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $secondSession);
        $secondPosition = $this->position($this->second, $secondSession);
        $this->postJson($this->path($this->second, $secondSession), [...$secondPosition,
            'latitude' => $this->first['latitude'], 'longitude' => $this->first['longitude']])->assertUnprocessable();
        $this->save($this->first, false);
        Sanctum::actingAs($this->first['user']);
        $this->getJson('/api/students/me/attendance')->assertExactJson([]);
        $this->postJson($this->path($this->first, $firstSession).'/challenge')->assertForbidden();
        $this->postJson($this->path($this->first, $firstSession), $firstPosition)->assertForbidden();

        Sanctum::actingAs($this->second['user']);
        $this->getJson('/api/students/me/attendance')->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $secondSession);
        $this->postJson($this->path($this->second, $secondSession), $secondPosition)->assertNoContent();
        foreach ([[$this->first, $firstSession], [$this->second, $secondSession]] as [$department, $session]) {
            $this->assertDatabaseHas('course_attendance', ['department_id' => $department['id'],
                'student_id' => $department['student']->id, 'course_id' => $department['course'],
                'session_id' => $session, 'hours' => 2.5, 'source' => 'student']);
        }
        $this->assertDatabaseCount('course_attendance', 2);
    }

    public function test_administrators_cannot_read_open_close_or_enroll_in_another_department(): void
    {
        $firstSession = $this->open($this->first);
        $secondSession = $this->open($this->second);
        Sanctum::actingAs($this->first['admin']);
        $this->putJson('/api/dashboard/attendance/settings', [...$this->first['settings'],
            'departmentId' => $this->second['id']])->assertForbidden();
        $this->withHeader('X-Department-Id', $this->second['id'])
            ->getJson('/api/dashboard/attendance/settings')->assertForbidden();
        $this->flushHeaders();
        $this->assertDatabaseMissing('app_settings', ['setting_key' => 'attendance']);
        $course = $this->second['course'];
        $this->getJson("/api/dashboard/courses/{$course}/attendance-sessions")->assertNotFound();
        $this->postJson("/api/dashboard/courses/{$course}/attendance-sessions", ['hours' => 3])->assertNotFound();
        $this->postJson("/api/dashboard/courses/{$course}/attendance-sessions/{$secondSession}/close")->assertNotFound();
        $this->putJson("/api/dashboard/courses/{$course}/enrollments", [
            'branchCode' => 'male', 'studentIds' => [$this->first['student']->id]])->assertNotFound();
        $this->postJson("/api/dashboard/courses/{$this->first['course']}/attendance-sessions/{$firstSession}/close")->assertNoContent();
        Sanctum::actingAs($this->second['admin']);
        $this->getJson("/api/dashboard/courses/{$course}/attendance-sessions")
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $secondSession)->assertJsonPath('0.isOpen', true);
    }
}
