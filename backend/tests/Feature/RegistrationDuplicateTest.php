<?php

namespace Tests\Feature;

use App\Models\RegistrationRequest;
use Illuminate\Support\Facades\DB;

class RegistrationDuplicateTest extends CoreDataApiTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        DB::table('registration_settings')->where('key', 'is_open')->update(['value' => '1']);
    }

    private function profile(string $phone = '0501234567'): array
    {
        return ['name' => 'طالب تجربة التسجيل', 'phone' => $phone, 'gender' => 'male', 'age' => 22];
    }

    public function test_repeat_request_is_rejected_without_overwriting_the_original_profile(): void
    {
        $id = $this->postJson('/api/public/registration-requests', $this->profile())->assertCreated()->json('id');
        $repeat = array_replace($this->profile(), ['name' => 'اسم مختلف للتجربة', 'gender' => 'female']);
        $this->postJson('/api/public/registration-requests', $repeat)->assertUnprocessable()
            ->assertJsonValidationErrors(['phone']);
        $this->assertDatabaseCount('registration_requests', 1);
        $this->assertDatabaseHas('registration_requests', [
            'id' => $id, 'full_name' => 'طالب تجربة التسجيل', 'gender' => 'male', 'status' => 'pending',
        ]);
        $this->getJson('/api/dashboard/registration')->assertOk()->assertJsonPath('requests.0.age', 22);
    }

    public function test_other_phone_can_register_while_the_first_request_is_pending(): void
    {
        $this->postJson('/api/public/registration-requests', $this->profile())->assertCreated();
        $this->postJson('/api/public/registration-requests', $this->profile('0501234568'))->assertCreated();
        $this->assertDatabaseCount('registration_requests', 2);
    }

    public function test_rejected_request_can_be_corrected_and_resubmitted(): void
    {
        $id = $this->postJson('/api/public/registration-requests', $this->profile())->assertCreated()->json('id');
        $this->postJson('/api/dashboard/registration-requests/'.$id.'/reject')->assertOk();
        $newId = $this->postJson('/api/public/registration-requests', $this->profile())->assertCreated()->json('id');
        $this->assertNotSame($id, $newId);
        $this->assertSame(1, RegistrationRequest::query()->where('status', 'pending')->count());
    }

    public function test_closed_registration_cannot_create_a_request(): void
    {
        DB::table('registration_settings')->where('key', 'is_open')->update(['value' => '0']);
        $this->postJson('/api/public/registration-requests', $this->profile())->assertUnprocessable()
            ->assertJsonValidationErrors(['registration']);
        $this->assertDatabaseCount('registration_requests', 0);
    }
}
