<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

final class CredentialLoginRoutingTest extends CoreDataApiTestCase
{
    public function test_short_and_symbol_login_codes_work_for_people_and_assigned_reciter_routes(): void
    {
        foreach (['0', 'س /?#'] as $index => $loginCode) {
            $student = $this->postJson('/api/students', [
                'name' => 'معلم برمز دخول مخصص', 'loginId' => $loginCode, 'branchId' => 'male',
                'password' => '0', 'passwordConfirmation' => '0',
            ])->assertCreated();
            $this->assertTrue(Hash::check('0', User::query()->where('login_code', $loginCode)->firstOrFail()->password));
            $reciterLogin = $index === 0 ? 'r' : 'ق /?#';
            $this->postJson('/api/reciters', [
                'name' => 'مقرئ برمز دخول مخصص', 'loginCode' => $reciterLogin, 'branchId' => 'male',
                'password' => 'a', 'passwordConfirmation' => 'a', 'linkedStudentIds' => [$student->json('id')],
            ])->assertOk();
            $this->getJson('/api/reciters/by-login/'.rawurlencode($reciterLogin))
                ->assertOk()->assertJsonPath('loginCode', $reciterLogin);
            $this->getJson('/api/students/by-login/'.rawurlencode($loginCode).'/assigned-reciter')
                ->assertOk()->assertJsonPath('loginCode', $reciterLogin);
            $this->deleteJson('/api/reciters/by-login/'.rawurlencode($reciterLogin))->assertOk();
        }
    }
}
