<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Reciter;
use App\Models\Student;
use App\Models\User;
use App\Services\UserManagementService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

class CompleteStudentPartsTest extends CoreDataApiTestCase
{
    private function student(string $branch = 'male'): Student
    {
        return Student::create(['full_name' => 'معلم تجريبي', 'login_code' => fake()->unique()->numerify('########'),
            'branch_id' => DB::table('branches')->where('code', $branch)->value('id')]);
    }

    public function test_select_all_respects_branch_limit_and_preserves_existing_marks_when_repeated(): void
    {
        foreach (['male' => 30, 'female' => 10] as $branch => $limit) {
            $student = $this->student($branch);
            DB::table('student_parts')->insert(['student_id' => $student->id, 'part_number' => 1, 'marked_at' => '2020-01-02 03:04:05']);
            $url = '/api/students/'.$student->id.'/parts';
            $this->putJson($url)->assertOk()->assertJsonPath('completedParts', range(1, $limit));
            $this->putJson($url)->assertOk()->assertJsonPath('completedParts', range(1, $limit));
            $this->assertSame($limit, $student->parts()->count());
            $this->assertDatabaseHas('student_parts', ['student_id' => $student->id, 'part_number' => 1, 'marked_at' => '2020-01-02 03:04:05']);
        }
    }

    public function test_reciter_can_only_complete_assigned_students_and_cannot_impersonate_another_reciter(): void
    {
        $student = $this->student();
        $unlinked = $this->student();
        $account = User::factory()->create(['role' => 'reciter']);
        $reciter = Reciter::create(['full_name' => 'مقرئ', 'user_id' => $account->id, 'branch_id' => $student->branch_id]);
        $reciter->students()->attach($student->id);
        Sanctum::actingAs($account);
        $this->putJson('/api/students/'.$unlinked->id.'/parts', ['reciterId' => $reciter->id])->assertForbidden();
        $this->putJson('/api/students/'.$student->id.'/parts', ['reciterId' => 'another-reciter'])->assertForbidden();
        $this->putJson('/api/students/'.$student->id.'/parts', ['reciterId' => $reciter->id])
            ->assertOk()->assertJsonCount(30, 'completedParts');
        $this->assertSame(30, $student->parts()->where('marked_by_reciter_id', $reciter->id)->count());
        $this->assertSame(0, $unlinked->parts()->count());
    }

    public function test_select_all_blocks_unauthorized_roles_branches_departments_and_invalid_requests(): void
    {
        $male = $this->student();
        $female = $this->student('female');
        $this->putJson('/api/students/'.$male->id.'/parts', ['reciterId' => []])->assertUnprocessable();
        foreach (['student', 'trainee'] as $role) {
            Sanctum::actingAs(User::factory()->create(['role' => $role]));
            $this->putJson('/api/students/'.$male->id.'/parts')->assertForbidden();
        }
        Sanctum::actingAs(User::factory()->create(['role' => 'male_manager']));
        $this->putJson('/api/students/'.$female->id.'/parts')->assertForbidden();
        $this->putJson('/api/students/'.$male->id.'/parts')->assertOk();
        $other = Department::create(['name' => 'إدارة أخرى', 'is_active' => true]);
        Sanctum::actingAs(User::factory()->create(['role' => 'admin', 'department_id' => $other->id]));
        $this->putJson('/api/students/'.$male->id.'/parts')->assertNotFound();
        $this->assertSame(0, $female->parts()->count());
    }

    public function test_guests_cannot_complete_parts(): void
    {
        $student = $this->student();
        Auth::forgetGuards();
        $this->putJson('/api/students/'.$student->id.'/parts')->assertUnauthorized();
        $this->assertSame(0, $student->parts()->count());
    }

    public function test_failed_bulk_save_rolls_back_every_new_part(): void
    {
        $student = $this->student();
        $real = new UserManagementService;
        $this->partialMock(UserManagementService::class, function ($mock) use ($real): void {
            $mock->shouldReceive('toggleStudentPart')->andReturnUsing(function ($id, $reciter, $part, $complete) use ($real): void {
                if ($part === 2) {
                    throw new \RuntimeException('Synthetic bulk save failure');
                }
                $real->toggleStudentPart($id, $reciter, $part, $complete);
            });
        });
        $this->putJson('/api/students/'.$student->id.'/parts')->assertServerError();
        $this->assertSame(0, $student->parts()->count());
    }
}
