<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\DepartmentManagementService;
use App\Services\StudentAccountService;
use App\Support\DepartmentContext;
use App\Support\DepartmentData;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class DepartmentAssessmentAvailabilityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        DepartmentContext::reset();
        parent::setUp();
    }

    protected function tearDown(): void
    {
        DepartmentContext::reset();
        parent::tearDown();
    }

    public function test_opening_a_pre_test_only_reaches_the_target_departments_teachers(): void
    {
        $departments = [];
        foreach (['88123501', '88123502'] as $login) {
            $department = app(DepartmentManagementService::class)->save([
                'name' => 'إدارة '.$login, 'managerTitle' => 'مسؤول '.$login,
                'managerLoginCode' => $login, 'managerPassword' => '12345678',
            ]);
            $course = (string) str()->uuid();
            DepartmentContext::run($department['id'], function () use ($course, $login): void {
                DepartmentData::table('courses')->insert([
                    'id' => $course, 'title' => 'دورة '.$login, 'is_active' => false,
                    'is_pre_enabled' => false, 'male_pre_enabled' => true, 'female_pre_enabled' => true,
                ]);
                app(StudentAccountService::class)->create('معلم '.$login, $login.'1', 'male', '', null);
            });
            $departments[] = [$department, $course, User::query()->where('login_code', $login.'1')->firstOrFail()];
        }
        [[$first, $firstCourse, $firstTeacher], [$second, $secondCourse, $secondTeacher]] = $departments;

        Sanctum::actingAs(User::query()->findOrFail($first['manager']['id']));
        $this->postJson('/api/dashboard/courses/'.$firstCourse.'/activate', [
            'pre' => true, 'post' => false, 'tasks' => false,
        ])->assertNoContent();

        Sanctum::actingAs($firstTeacher);
        $this->getJson('/api/dashboard/snapshot')->assertOk()->assertJsonCount(1, 'courses')
            ->assertJsonPath('courses.0.id', $firstCourse)->assertJsonPath('courses.0.isActive', true)
            ->assertJsonPath('courses.0.isPreEnabled', true);

        Sanctum::actingAs($secondTeacher);
        $this->getJson('/api/dashboard/snapshot')->assertOk()->assertJsonCount(1, 'courses')
            ->assertJsonPath('courses.0.id', $secondCourse)->assertJsonPath('courses.0.isActive', false)
            ->assertJsonPath('courses.0.isPreEnabled', false);
        $this->withHeader('X-Department-Id', $first['id'])->getJson('/api/dashboard/snapshot')->assertForbidden();
        $this->flushHeaders();

        Sanctum::actingAs(User::query()->findOrFail($second['manager']['id']));
        $this->postJson('/api/dashboard/courses/'.$firstCourse.'/activate', ['pre' => true])->assertNotFound();
        $this->assertDatabaseHas('courses', ['id' => $firstCourse, 'department_id' => $first['id'], 'is_pre_enabled' => true]);
        $this->assertDatabaseHas('courses', ['id' => $secondCourse, 'department_id' => $second['id'], 'is_active' => false]);
    }
}
