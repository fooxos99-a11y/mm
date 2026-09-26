<?php

namespace Tests\Feature;

use App\Models\Reciter;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PeopleEditorTest extends TestCase
{
    use RefreshDatabase;

    public function test_options_search_and_paginate_without_loading_student_details(): void
    {
        $this->acting('admin');
        for ($i = 0; $i < 25; $i++) {
            $this->student('male', 'teacher'.sprintf('%02d', $i));
        }
        $this->student('female', 'hidden');
        $this->getJson('/api/dashboard/people/options?perPage=20&page=2')->assertOk()
            ->assertJsonCount(5, 'data')->assertJsonPath('total', 25);
        $response = $this->getJson('/api/dashboard/people/options?search=teacher24')
            ->assertOk()
            ->assertJsonCount(1, 'data');
        $this->assertSame(['value', 'label'], array_keys($response->json('data.0')));
        $this->getJson('/api/dashboard/people/options?perPage=101')->assertUnprocessable();
        $this->getJson('/api/dashboard/people/options?type=invalid')->assertUnprocessable();
    }

    public function test_details_include_only_the_selected_person_and_required_relationship_ids(): void
    {
        $this->acting('admin');
        $student = $this->student('female', 'teacher');
        $user = User::factory()->create(['role' => 'reciter', 'login_code' => 'reader']);
        $reciter = Reciter::query()
            ->create(['full_name' => 'Reader', 'user_id' => $user->id, 'branch_id' => $student->branch_id]);
        $reciter->students()->attach($student->id);
        DB::table('student_parts')->insert(['student_id' => $student->id, 'part_number' => 2]);
        $this->getJson('/api/dashboard/people/student/'.$student->id)->assertOk()
            ->assertJsonPath('completedParts', [2])->assertJsonPath('reciterId', $reciter->id)
            ->assertJsonPath('note', 'Private note');
        $response = $this->getJson('/api/dashboard/people/reciter/'.$reciter->id)->assertOk()
            ->assertJsonPath('studentIds', [$student->id])->assertJsonPath('loginCode', 'reader');
        $this->assertArrayNotHasKey('password', $response->json());
        $this->assertArrayNotHasKey('user', $response->json());
        $this->getJson('/api/dashboard/people/options?type=reciter&branchCode=female&search=reader')
            ->assertOk()->assertJsonPath('data.0.value', $reciter->id);
    }

    public function test_manager_scope_and_page_permission_apply_to_options_and_details(): void
    {
        $male = $this->student('male', 'visible');
        $female = $this->student('female', 'hidden');
        $this->acting('male_manager');
        $this->getJson('/api/dashboard/people/student/'.$male->id)->assertOk();
        $this->getJson('/api/dashboard/people/student/'.$female->id)->assertNotFound();
        $this->getJson('/api/dashboard/people/options?branchCode=female')->assertForbidden();
        $this->getJson('/api/dashboard/people/options?search=hidden')->assertOk()->assertJsonCount(0, 'data');
        DB::table('role_permissions')
            ->where('role', 'male_manager')
            ->where('permission_key', 'page_users')
            ->update(['is_enabled' => false]);
        $this->getJson('/api/dashboard/people/options')->assertForbidden();
        $this->getJson('/api/dashboard/people/student/'.$male->id)->assertForbidden();
        $this->acting('student');
        $this->getJson('/api/dashboard/people/options')->assertForbidden();
    }

    public function test_editing_a_student_accepts_an_empty_optional_note(): void
    {
        $this->acting('admin');
        $student = $this->student('male', 'teacher');
        $this->putJson('/api/students/'.$student->id, ['name' => 'Updated', 'note' => ''])->assertOk();
        $this->assertDatabaseHas('students', ['id' => $student->id, 'full_name' => 'Updated', 'note' => '']);
    }

    private function acting(string $role): void
    {
        DB::table('role_permissions')
            ->updateOrInsert(['role' => $role, 'permission_key' => 'page_users'], ['is_enabled' => true]);
        Sanctum::actingAs(User::factory()->create(['role' => $role]));
    }

    private function student(string $branch, string $login): Student
    {
        return Student::query()->create(['full_name' => $login, 'login_code' => $login, 'note' => 'Private note',
            'branch_id' => DB::table('branches')->where('code', $branch)->value('id')]);
    }
}
