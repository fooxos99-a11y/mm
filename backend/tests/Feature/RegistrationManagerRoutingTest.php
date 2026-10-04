<?php

namespace Tests\Feature;

use App\Models\RegistrationRequest;
use App\Models\User;
use App\Services\RegistrationMetadataService;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

class RegistrationManagerRoutingTest extends CoreDataApiTestCase
{
    public function test_managers_see_and_review_only_their_new_and_legacy_requests(): void
    {
        $requests = [];
        foreach (['male', 'female'] as $gender) {
            foreach ([false, true] as $legacy) {
                $request = RegistrationRequest::query()->create([
                    'full_name' => 'طلب تسجيل تجريبي',
                    'gender' => $legacy ? null : $gender,
                    'status' => 'pending',
                ]);
                if ($legacy) {
                    app(RegistrationMetadataService::class)->store($request->id, '0501234567', $gender, []);
                }
                $requests[$gender][] = $request;
            }
        }
        RegistrationRequest::query()->create(['full_name' => 'طلب بلا جنس', 'status' => 'pending']);

        $this->getJson('/api/dashboard/registration')->assertOk()->assertJsonCount(5, 'requests');

        foreach (['male', 'female'] as $gender) {
            $role = $gender.'_manager';
            foreach (['page_registration', 'edit_student'] as $permission) {
                DB::table('role_permissions')->updateOrInsert(
                    ['role' => $role, 'permission_key' => $permission],
                    ['is_enabled' => true],
                );
            }
            Sanctum::actingAs(User::factory()->create(['role' => $role]));
            $response = $this->getJson('/api/dashboard/registration')->assertOk()->assertJsonCount(2, 'requests');
            $this->assertEqualsCanonicalizing(
                array_map(fn ($request) => $request->id, $requests[$gender]),
                array_column($response->json('requests'), 'id'),
            );
            $otherGender = $gender === 'male' ? 'female' : 'male';
            foreach ($requests[$otherGender] as $request) {
                $this->postJson("/api/dashboard/registration-requests/{$request->id}/reject")->assertForbidden();
            }
            foreach ($requests[$gender] as $request) {
                $this->postJson("/api/dashboard/registration-requests/{$request->id}/reject")->assertOk();
            }
            DB::table('role_permissions')->where('role', $role)->where('permission_key', 'page_registration')
                ->update(['is_enabled' => false]);
            $this->getJson('/api/dashboard/registration')->assertForbidden();
        }
    }
}
