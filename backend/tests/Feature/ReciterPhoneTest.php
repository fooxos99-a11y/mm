<?php

namespace Tests\Feature;

use App\Models\Reciter;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

class ReciterPhoneTest extends CoreDataApiTestCase
{
    private function payload(array $updates = []): array
    {
        return [...['name' => 'مقرئ تجريبي', 'loginCode' => '001234', 'branchId' => 'male'], ...$updates];
    }

    public function test_optional_phone_does_not_change_existing_identity_or_relationships(): void
    {
        $student = Student::query()->create(['full_name' => 'معلم تجريبي', 'login_code' => '001235',
            'branch_id' => DB::table('branches')->where('code', 'male')->value('id')]);
        $this->postJson('/api/reciters', $this->payload(['linkedStudentIds' => [$student->id]]))
            ->assertOk()->assertJsonPath('phone', null);
        $reciter = Reciter::query()->firstOrFail();
        DB::table('reciter_students')->where('reciter_id', $reciter->id)
            ->update(['created_at' => '2025-01-02 03:04:05']);
        $originalLink = (array) DB::table('reciter_students')->where('reciter_id', $reciter->id)->first();
        $originalUser = $reciter->user->getAttributes();
        $updates = ['currentLoginCode' => '001234', 'linkedStudentIds' => [$student->id]];
        $this->postJson('/api/reciters', $this->payload([...$updates, 'phone' => '٠٥٠ ١٢٣ ٤٥٦٧']))
            ->assertOk()->assertJsonPath('phone', '0501234567')->assertJsonPath('id', $reciter->id)
            ->assertJsonPath('loginCode', '001234')->assertJsonPath('studentIds', [$student->id]);
        $this->assertSame($originalUser, $reciter->user->fresh()->getAttributes());
        $this->getJson('/api/dashboard/people/reciter/'.$reciter->id)->assertOk()->assertJsonPath('phone', '0501234567');
        $this->getJson('/api/dashboard/people?type=reciter')->assertOk()->assertJsonPath('data.0.phone', '0501234567');
        // Older callers that omit the field must preserve the saved number.
        $this->postJson('/api/reciters', $this->payload($updates))->assertOk()->assertJsonPath('phone', '0501234567');
        $this->postJson('/api/reciters', $this->payload([...$updates, 'phone' => '+966501234567']))
            ->assertOk()->assertJsonPath('phone', '+966501234567');
        $this->postJson('/api/reciters', $this->payload([...$updates, 'phone' => '']))
            ->assertOk()->assertJsonPath('phone', null);
        $this->assertDatabaseCount('reciters', 1);
        $this->assertSame($originalLink, (array) DB::table('reciter_students')->where('reciter_id', $reciter->id)->first());
    }

    public function test_invalid_phones_are_rejected_without_creating_accounts(): void
    {
        foreach (['abc', '0', '1234', '050123456', '05012345678', 'javascript:alert(1)', ['0501234567']] as $phone) {
            $this->postJson('/api/reciters', $this->payload(['phone' => $phone]))
                ->assertUnprocessable()->assertJsonValidationErrors('phone');
        }
        $this->assertDatabaseCount('reciters', 0);
        $this->assertDatabaseMissing('users', ['login_code' => '001234']);
    }

    public function test_students_and_trainees_can_only_read_their_assigned_phone_and_cannot_edit_it(): void
    {
        $this->postJson('/api/reciters', $this->payload(['phone' => '0501234567']))->assertOk();
        $reciter = Reciter::query()->firstOrFail();
        foreach (['student', 'trainee'] as $role) {
            $login = 'phone-'.$role;
            $student = Student::query()->create(['full_name' => $role, 'login_code' => $login,
                'branch_id' => $reciter->branch_id]);
            $reciter->students()->attach($student->id);
            Sanctum::actingAs(User::factory()->create(['role' => $role, 'login_code' => $login]));
            $this->getJson('/api/students/by-login/'.$login.'/assigned-reciter')
                ->assertOk()->assertJsonPath('phone', '0501234567');
            $this->getJson('/api/students/by-login/another-account/assigned-reciter')->assertForbidden();
            $this->postJson('/api/reciters', $this->payload(['currentLoginCode' => '001234', 'phone' => '0551234567']))
                ->assertForbidden();
            $this->getJson('/api/dashboard/people/reciter/'.$reciter->id)->assertForbidden();
        }
        $this->assertSame('0501234567', $reciter->fresh()->phone);
    }
}
