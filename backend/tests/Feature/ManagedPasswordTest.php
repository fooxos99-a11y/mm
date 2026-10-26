<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

class ManagedPasswordTest extends CoreDataApiTestCase
{
    private function createPerson(string $type): array
    {
        $data = ['name' => 'حساب فحص', 'branchId' => 'male', 'password' => '01234567', 'passwordConfirmation' => '01234567'];
        $result = $type === 'student'
            ? $this->postJson('/api/students', [...$data, 'loginId' => '00708'])->assertCreated()
            : $this->postJson('/api/reciters', [...$data, 'loginCode' => '00709'])->assertOk();

        return [$result->json('id'), $type === 'student' ? '00708' : '00709'];
    }

    public function test_admin_can_reveal_saved_password_and_reset_it_without_losing_identity(): void
    {
        foreach (['student', 'reciter'] as $type) {
            [$id, $code] = $this->createPerson($type);
            $url = '/api/dashboard/people/'.$type.'/'.$id.'/password';
            $this->postJson($url)->assertOk()->assertJsonPath('password', '01234567')
                ->assertHeader('Cache-Control', 'no-store, private')->assertHeader('Pragma', 'no-cache');
            $account = User::where('login_code', $code)->firstOrFail();
            $cipher = DB::table('student_initial_credentials')->where('user_id', $account->id)->value('encrypted_password');
            $this->assertNotSame('01234567', $cipher);
            $this->assertSame('01234567', Crypt::decryptString($cipher));
            $token = $account->createToken('obsolete')->accessToken->id;
            $data = ['name' => 'اسم محدث', 'branchId' => 'male', 'password' => '87654321', 'passwordConfirmation' => '87654321'];
            if ($type === 'student') {
                $this->putJson('/api/students/'.$id, $data)->assertOk();
            } else {
                $this->postJson('/api/reciters', [...$data, 'currentLoginCode' => $code, 'loginCode' => $code])->assertOk();
            }
            $this->postJson($url)->assertOk()->assertJsonPath('password', '87654321');
            $this->assertSame($account->id, User::where('login_code', $code)->value('id'));
            $this->assertDatabaseMissing('personal_access_tokens', ['id' => $token]);
            $this->getJson('/api/dashboard/people/'.$type.'/'.$id)->assertOk()->assertJsonMissingPath('password');
            $this->assertTrue(Hash::check('87654321', $account->fresh()->password));
        }
    }

    public function test_missing_or_stale_password_is_not_invented_and_non_password_edits_preserve_the_copy(): void
    {
        [$id, $code] = $this->createPerson('student');
        $url = '/api/dashboard/people/student/'.$id.'/password';
        $this->putJson('/api/students/'.$id, ['name' => 'اسم فقط'])->assertOk();
        $this->postJson($url)->assertOk()->assertJsonPath('password', '01234567');
        $user = User::where('login_code', $code)->firstOrFail();
        DB::table('student_initial_credentials')->where('user_id', $user->id)->update(['encrypted_password' => Crypt::encryptString('stale')]);
        $this->postJson($url)->assertOk()->assertJsonPath('available', false)->assertJsonPath('password', null);
        DB::table('student_initial_credentials')->where('user_id', $user->id)->delete();
        $this->postJson($url)->assertOk()->assertJsonPath('available', false)->assertJsonPath('password', null);
    }

    public function test_password_reveal_rejects_other_departments_managers_and_non_administrators(): void
    {
        $urls = [];
        foreach (['student', 'reciter'] as $type) {
            [$id] = $this->createPerson($type);
            $urls[] = '/api/dashboard/people/'.$type.'/'.$id.'/password';
        }
        foreach (['student', 'trainee', 'reciter', 'male_manager', 'female_manager'] as $role) {
            Sanctum::actingAs(User::factory()->create(['role' => $role]));
            foreach ($urls as $url) {
                $this->postJson($url)->assertForbidden();
            }
        }
        $department = Department::create(['name' => 'إدارة أخرى', 'is_active' => true]);
        Sanctum::actingAs(User::factory()->create(['role' => 'admin', 'department_id' => $department->id]));
        foreach ($urls as $url) {
            $this->postJson($url)->assertNotFound();
        }
    }

    public function test_supervisory_passwords_are_only_revealed_to_the_department_administrator(): void
    {
        $response = $this->postJson('/api/dashboard/accounts', ['name' => 'مشرف تجريبي', 'loginCode' => '00710',
            'role' => 'male_manager', 'password' => '01234567'])->assertCreated();
        $url = '/api/dashboard/people/account/'.$response->json('id').'/password';
        $this->postJson($url)->assertOk()->assertJsonPath('password', '01234567');
        $this->putJson('/api/dashboard/accounts/'.$response->json('id'), ['name' => 'مشرف تجريبي',
            'loginCode' => '00710', 'role' => 'male_manager', 'isActive' => true, 'password' => '87654321',
            'revision' => $response->json('revision')])->assertOk();
        $this->postJson($url)->assertOk()->assertJsonPath('password', '87654321');
        Sanctum::actingAs(User::where('login_code', '00710')->firstOrFail());
        $this->postJson($url)->assertForbidden();
        $other = Department::create(['name' => 'إدارة أخرى', 'is_active' => true]);
        Sanctum::actingAs(User::factory()->create(['role' => 'admin', 'department_id' => $other->id]));
        $this->postJson($url)->assertNotFound();
    }

    public function test_guests_cannot_reveal_credentials(): void
    {
        [$id] = $this->createPerson('student');
        Auth::forgetGuards();
        $this->postJson('/api/dashboard/people/student/'.$id.'/password')->assertUnauthorized();
    }
}
