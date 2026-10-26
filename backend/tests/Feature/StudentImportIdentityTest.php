<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\RegistrationRequest;
use App\Models\User;

class StudentImportIdentityTest extends CoreDataApiTestCase
{
    private function payload(string $name = 'خريج'): array
    {
        return ['sourceHash' => str_repeat('e', 64), 'branchId' => 'male', 'entries' => [
            ['name' => $name, 'loginCode' => '0838', 'password' => 'Temporary-7812', 'sourceRow' => 2,
                'sourceFields' => [['label' => 'رقم الجـــوال', 'value' => '0551234567']]],
        ]];
    }

    public function test_existing_name_blocks_new_code_without_creating_duplicate(): void
    {
        User::factory()->create(['full_name' => 'خريج', 'login_code' => '0700']);
        $payload = $this->payload();
        $preview = $this->postJson('/api/students/import/preview', $payload)->assertOk()
            ->assertJsonPath('identityConflicts.0.loginCodes.0', '0700');
        $this->postJson('/api/students/import', [...$payload, 'confirmation' => $preview->json('confirmation')])->assertUnprocessable();
        $this->assertDatabaseMissing('users', ['login_code' => '0838']);
    }

    public function test_source_phone_matches_existing_profile_even_if_name_differs(): void
    {
        RegistrationRequest::query()->create(['full_name' => 'الاسم السابق', 'login_code' => '0701', 'gender' => 'male',
            'branch_code' => 'male', 'status' => 'accepted', 'answers' => [['label' => 'رقم الجوال', 'value' => '+966551234567']]]);
        $this->postJson('/api/students/import/preview', $this->payload('اسم مختلف'))->assertOk()
            ->assertJsonPath('identityConflicts.0.loginCodes.0', '0701');
    }

    public function test_other_department_identity_is_not_exposed_and_source_duplicates_are_blocked(): void
    {
        $other = Department::create(['name' => 'قسم آخر', 'is_active' => true]);
        User::factory()->create(['department_id' => $other->id, 'full_name' => 'خريج', 'login_code' => '0799']);
        $payload = $this->payload();
        $this->postJson('/api/students/import/preview', $payload)->assertOk()->assertJsonPath('identityConflicts', []);
        $second = $payload['entries'][0];
        $second['loginCode'] = '0839';
        $second['sourceRow'] = 3;
        $payload['entries'][] = $second;
        $this->postJson('/api/students/import/preview', $payload)->assertOk()
            ->assertJsonPath('identityConflicts.0.duplicateRows.0', 2);
    }
}
