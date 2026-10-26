<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

class ImportedTemporaryPasswordTest extends CoreDataApiTestCase
{
    public function test_imported_student_keeps_administrator_password_even_when_import_requests_a_change(): void
    {
        $payload = ['sourceHash' => str_repeat('b', 64), 'branchId' => 'male', 'entries' => [
            ['name' => 'خريج تجريبي', 'loginCode' => '0838', 'password' => 'Temp-Only-9381',
                'mustChangePassword' => true, 'sourceRow' => 2, 'sourceFields' => []],
        ]];
        $preview = $this->postJson('/api/students/import/preview', $payload)->assertOk();
        $this->postJson('/api/students/import', [...$payload, 'confirmation' => $preview->json('confirmation')])->assertOk();
        $student = User::where('login_code', '0838')->firstOrFail();
        $this->assertFalse($student->must_change_password);
        Sanctum::actingAs($student);
        $this->getJson('/api/dashboard/snapshot')->assertOk();
        $this->putJson('/api/auth/password', [
            'currentPassword' => 'wrong', 'password' => 'Changed-12849', 'passwordConfirmation' => 'Changed-12849',
        ])->assertForbidden();
        $this->putJson('/api/auth/password', [
            'currentPassword' => 'Temp-Only-9381', 'password' => 'Changed-12849', 'passwordConfirmation' => 'Changed-12849',
        ])->assertForbidden();
        $this->assertFalse($student->fresh()->must_change_password);
        $this->assertTrue(Hash::check('Temp-Only-9381', $student->fresh()->password));
        $this->assertDatabaseHas('student_initial_credentials', ['user_id' => $student->id]);
    }

    public function test_existing_student_credentials_remain_managed_by_administrator(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'student', 'must_change_password' => false]));
        $this->putJson('/api/auth/password', [
            'currentPassword' => '12345678', 'password' => 'Changed-12849', 'passwordConfirmation' => 'Changed-12849',
        ])->assertForbidden();
    }
}
