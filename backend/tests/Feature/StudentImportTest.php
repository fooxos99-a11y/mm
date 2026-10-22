<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

class StudentImportTest extends CoreDataApiTestCase
{
    private function payload(): array
    {
        return ['sourceHash' => str_repeat('a', 64), 'branchId' => 'male', 'entries' => [
            ['name' => 'طالب أول', 'loginCode' => '0700', 'password' => '0700', 'sourceRow' => 2,
                'sourceFields' => [['label' => 'اسم المجمع', 'value' => 'مجمع الاختبار'], ['label' => 'الحالة', 'value' => 'راسب']]],
            ['name' => 'طالب ثان', 'loginCode' => '0701', 'password' => '0701', 'sourceRow' => 3, 'sourceFields' => []],
        ]];
    }

    private function import(): array
    {
        $payload = $this->payload();
        $preview = $this->postJson('/api/students/import/preview', $payload)->assertOk();

        return $this->postJson('/api/students/import', [...$payload, 'confirmation' => $preview->json('confirmation')])
            ->assertOk()->json();
    }

    public function test_preview_is_read_only_and_import_is_complete_and_idempotent(): void
    {
        $payload = $this->payload();
        $preview = $this->postJson('/api/students/import/preview', $payload)->assertOk()->assertJsonPath('count', 2);
        $this->assertDatabaseMissing('users', ['login_code' => '0700']);
        $result = $this->import();
        $this->assertSame(2, $result['imported']);
        $this->assertDatabaseHas('students', ['login_code' => '0700', 'is_certified' => false]);
        $this->assertDatabaseCount('student_import_items', 2);
        $request = DB::table('registration_requests')->where('login_code', '0700')->first();
        $this->assertSame('راسب', json_decode($request->answers, true)['import_1']['value']);
        $user = User::where('login_code', '0700')->firstOrFail();
        $this->assertTrue(Hash::check('0700', $user->password));
        $encrypted = DB::table('student_initial_credentials')->where('user_id', $user->id)->value('encrypted_password');
        $this->assertNotSame('0700', $encrypted);
        $this->assertSame('0700', Crypt::decryptString($encrypted));
        $this->postJson('/api/students/import', [...$payload, 'confirmation' => $preview->json('confirmation')])
            ->assertOk()->assertJsonPath('alreadyImported', true);
        $this->assertDatabaseCount('student_import_items', 2);
    }

    public function test_conflict_blocks_whole_batch_including_foreign_and_archived_codes(): void
    {
        $other = Department::create(['name' => 'إدارة أخرى', 'is_active' => true]);
        User::factory()->create(['department_id' => $other->id, 'login_code' => '0701']);
        $payload = $this->payload();
        $preview = $this->postJson('/api/students/import/preview', $payload)->assertOk()->assertJsonPath('conflicts.0', '0701');
        $this->postJson('/api/students/import', [...$payload, 'confirmation' => $preview->json('confirmation')])->assertUnprocessable();
        $this->assertDatabaseMissing('students', ['login_code' => '0700']);
        $this->assertDatabaseCount('student_import_batches', 0);
    }

    public function test_confirmation_cannot_be_reused_with_changed_rows_or_another_department(): void
    {
        $payload = $this->payload();
        $preview = $this->postJson('/api/students/import/preview', $payload)->assertOk();
        $payload['entries'][0]['name'] = 'اسم مختلف';
        $this->postJson('/api/students/import', [...$payload, 'confirmation' => $preview->json('confirmation')])->assertUnprocessable();
        $this->assertDatabaseCount('student_import_batches', 0);
        $other = Department::create(['name' => 'إدارة ثانية', 'is_active' => true]);
        Sanctum::actingAs(User::factory()->create(['role' => 'admin', 'department_id' => $other->id]));
        $this->postJson('/api/students/import', [...$this->payload(), 'confirmation' => $preview->json('confirmation')])->assertUnprocessable();
    }

    public function test_initial_password_requires_edit_permission_and_is_removed_after_password_change(): void
    {
        $this->import();
        $student = Student::where('login_code', '0700')->firstOrFail();
        $url = '/api/students/'.$student->id.'/initial-password';
        $this->postJson($url)->assertOk()->assertJsonPath('password', '0700')->assertHeader('Cache-Control', 'no-store, private');
        $account = User::where('login_code', '0700')->firstOrFail();
        Sanctum::actingAs($account);
        $this->postJson($url)->assertForbidden();
        Sanctum::actingAs(User::factory()->create(['role' => 'male_manager']));
        $this->postJson($url)->assertForbidden();
        $other = Department::create(['name' => 'إدارة أجنبية', 'is_active' => true]);
        Sanctum::actingAs(User::factory()->create(['role' => 'admin', 'department_id' => $other->id]));
        $this->postJson($url)->assertNotFound();
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $account->password = Hash::make('new-password');
        $account->save();
        $this->postJson($url)->assertOk()->assertJsonPath('password', null)->assertJsonPath('available', false);
        $this->assertDatabaseMissing('student_initial_credentials', ['user_id' => $account->id]);
    }

    public function test_students_cannot_import_and_duplicate_or_blank_codes_fail(): void
    {
        $payload = $this->payload();
        $payload['entries'][1]['loginCode'] = '0700';
        $this->postJson('/api/students/import/preview', $payload)->assertUnprocessable();
        Sanctum::actingAs(User::factory()->create(['role' => 'student']));
        $this->postJson('/api/students/import/preview', $this->payload())->assertForbidden();
        $this->postJson('/api/students/import', $this->payload())->assertForbidden();
    }

    public function test_failure_during_write_rolls_back_all_tables(): void
    {
        $payload = $this->payload();
        $preview = $this->postJson('/api/students/import/preview', $payload)->assertOk();
        Student::creating(function (Student $student): void {
            if ($student->login_code === '0701') {
                throw new \RuntimeException('synthetic write failure');
            }
        });
        $this->postJson('/api/students/import', [...$payload, 'confirmation' => $preview->json('confirmation')])->assertServerError();
        $this->assertDatabaseMissing('students', ['login_code' => '0700']);
        $this->assertDatabaseMissing('users', ['login_code' => '0700']);
        $this->assertDatabaseCount('student_import_batches', 0);
        $this->assertDatabaseCount('student_import_items', 0);
        $this->assertDatabaseCount('student_initial_credentials', 0);
        $this->assertDatabaseMissing('reserved_login_codes', ['login_code' => '0700']);
    }
}
