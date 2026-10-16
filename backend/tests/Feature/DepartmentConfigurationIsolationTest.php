<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\DepartmentManagementService;
use App\Services\RegistrationService;
use App\Support\DepartmentContext;
use App\Support\DepartmentData;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class DepartmentConfigurationIsolationTest extends TestCase
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

    private function department(string $login): array
    {
        $department = app(DepartmentManagementService::class)->save([
            'name' => 'إدارة '.$login, 'managerTitle' => 'مسؤول '.$login,
            'managerLoginCode' => $login, 'managerPassword' => '12345678',
        ]);

        return [$department['id'], User::query()->findOrFail($department['manager']['id'])];
    }

    public function test_public_registration_forms_and_requests_are_separate_and_foreign_requests_cannot_be_processed(): void
    {
        [$first, $firstManager] = $this->department('88123456');
        [$second, $secondManager] = $this->department('88123457');
        $requests = [];
        foreach ([$first => 'FIRST', $second => 'SECOND'] as $id => $label) {
            DepartmentContext::run($id, function () use ($label): void {
                $service = app(RegistrationService::class);
                $service->updateRegistrationSettings(true);
                $service->updateRegistrationFormFields([
                    ['id' => 'custom', 'label' => $label.'_FORM', 'type' => 'text', 'required' => true],
                ], ['name' => $label.'_NAME']);
            });
            $this->getJson('/api/public/registration?departmentId='.$id)->assertOk()
                ->assertJsonPath('fields.0.label', $label.'_FORM')->assertJsonPath('fixedLabels.name', $label.'_NAME');
            $requests[$id] = $this->postJson('/api/public/registration-requests', [
                'departmentId' => $id, 'name' => 'طلب '.$label, 'phone' => '0501234567', 'gender' => 'male',
                'answers' => ['custom' => $label.'_ANSWER'],
            ])->assertCreated()->json('id');
            $this->assertDatabaseHas('registration_requests', ['id' => $requests[$id], 'department_id' => $id]);
        }
        Sanctum::actingAs($firstManager);
        $this->getJson('/api/dashboard/registration')->assertOk()->assertJsonCount(1, 'requests')
            ->assertJsonPath('requests.0.id', $requests[$first])->assertJsonPath('fields.0.label', 'FIRST_FORM')
            ->assertJsonPath('registrationUrl', config('app.frontend_url').'/registration?departmentId='.$first);
        $this->postJson('/api/dashboard/registration-requests/'.$requests[$second].'/reject', ['reason' => 'محاولة من إدارة أخرى'])
            ->assertNotFound();
        $this->assertDatabaseHas('registration_requests', ['id' => $requests[$second], 'status' => 'pending']);
        $this->putJson('/api/dashboard/registration/settings', ['isOpen' => false])->assertNoContent();
        Sanctum::actingAs($secondManager);
        $this->getJson('/api/dashboard/registration')->assertOk()->assertJsonPath('isOpen', true)
            ->assertJsonPath('fields.0.label', 'SECOND_FORM')->assertJsonPath('requests.0.id', $requests[$second]);
        $this->withHeader('X-Department-Id', $first)->getJson('/api/dashboard/registration')->assertForbidden();
    }

    public function test_courses_pre_post_and_final_questions_and_task_templates_are_private_to_their_department(): void
    {
        [$first, $firstManager] = $this->department('88123458');
        [$second, $secondManager] = $this->department('88123459');
        foreach ([$first => 'FIRST', $second => 'SECOND'] as $id => $tag) {
            DepartmentContext::run($id, function () use ($tag): void {
                $course = (string) Str::uuid();
                DepartmentData::table('courses')->insert(['id' => $course, 'title' => $tag.'_COURSE', 'is_active' => true]);
                foreach (['pre', 'post'] as $type) {
                    DepartmentData::table('course_questions')->insert([
                        'id' => (string) Str::uuid(), 'course_id' => $course, 'assessment_type' => $type,
                        'question_type' => 'text', 'prompt' => $tag.'_QUESTION_'.$type,
                    ]);
                }
                DepartmentData::table('final_exam_questions')->insert([
                    'id' => (string) Str::uuid(), 'branch_code' => 'male',
                    'question_type' => 'text', 'prompt' => $tag.'_FINAL',
                ]);
                DepartmentData::table('task_templates')->insert([
                    'id' => (string) Str::uuid(), 'name' => $tag.'_TASK', 'content' => $tag.'_TASK_CONTENT',
                ]);
            });
        }
        foreach ([[$firstManager, 'FIRST', 'SECOND'], [$secondManager, 'SECOND', 'FIRST']] as [$manager, $own, $foreign]) {
            Sanctum::actingAs($manager);
            $snapshot = $this->getJson('/api/dashboard/snapshot')->assertOk()->json();
            $serialized = json_encode($snapshot);
            foreach (['_COURSE', '_QUESTION_pre', '_QUESTION_post', '_FINAL', '_TASK_CONTENT'] as $suffix) {
                $this->assertStringContainsString($own.$suffix, $serialized);
                $this->assertStringNotContainsString($foreign.$suffix, $serialized);
            }
        }
        $this->assertDatabaseCount('course_questions', 4);
        $this->assertDatabaseCount('final_exam_questions', 2);
        $this->assertDatabaseCount('task_templates', 2);
    }
}
