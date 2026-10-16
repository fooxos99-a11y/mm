<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\User;
use App\Services\AccountRegistrationService;
use App\Services\StudentAccountService;
use App\Support\DepartmentContext;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

final class AcceptedRegistrationReservationMigrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        DepartmentContext::reset();
        parent::setUp();
    }

    protected function tearDown(): void
    {
        DepartmentContext::reset();
        parent::tearDown();
    }

    public function test_fresh_migration_install_and_empty_reruns_are_safe(): void
    {
        $this->assertDatabaseHas('migrations', ['migration' => '2026_10_16_020000_reserve_accepted_registration_login_codes']);
        $this->migration()->up();
        $this->migration()->up();
        $this->assertDatabaseCount('reserved_login_codes', 0);
    }

    public function test_up_backfills_only_missing_accepted_number_with_original_department_and_acceptance_time(): void
    {
        $department = Department::create(['name' => 'إدارة الطلب الأصلي']);
        $this->request('7424', 'accepted', $department->id, '2026-10-14 08:00:00', '2026-10-15 09:00:00');
        $this->migration()->up();

        $this->assertDatabaseHas('reserved_login_codes', [
            'login_code' => '7424', 'user_id' => null, 'department_id' => $department->id,
            'created_at' => '2026-10-15 09:00:00',
        ]);
        $before = (array) DB::table('reserved_login_codes')->where('login_code', '7424')->first();
        $this->migration()->up();
        $this->migration()->down();
        $this->migration()->up();
        $this->assertSame($before, (array) DB::table('reserved_login_codes')->where('login_code', '7424')->first());
    }

    public function test_existing_owner_and_existing_foreign_provisional_origin_are_never_reassigned(): void
    {
        $owner = User::factory()->create(['login_code' => '6524']);
        $foreign = Department::create(['name' => 'إدارة طلب مختلف']);
        DB::table('reserved_login_codes')->insert([
            'login_code' => '6534', 'user_id' => null, 'department_id' => DepartmentContext::DEFAULT_ID,
            'created_at' => '2026-10-01 01:00:00',
        ]);
        $this->request('6524', 'accepted', $foreign->id);
        $this->request('6534', 'accepted', $foreign->id);
        $before = DB::table('reserved_login_codes')->orderBy('login_code')->get()->map(fn ($row) => (array) $row)->all();

        $this->migration()->up();

        $this->assertSame($before, DB::table('reserved_login_codes')->orderBy('login_code')->get()->map(fn ($row) => (array) $row)->all());
        $this->assertDatabaseHas('users', ['id' => $owner->id, 'login_code' => '6524', 'department_id' => DepartmentContext::DEFAULT_ID]);
    }

    public function test_pending_rejected_and_empty_numbers_are_not_reserved(): void
    {
        $this->request('7441', 'pending');
        $this->request('7442', 'rejected');
        $this->request(null, 'accepted');
        $this->request('', 'accepted');
        $this->request('   ', 'accepted');
        $this->migration()->up();

        $this->assertDatabaseCount('reserved_login_codes', 0);
    }

    public function test_earliest_acceptance_keeps_original_department_when_legacy_requests_repeat_number(): void
    {
        $first = Department::create(['name' => 'الإدارة الأصلية']);
        $second = Department::create(['name' => 'إدارة لاحقة']);
        $this->request('6644', 'accepted', $second->id, '2026-10-01 00:00:00', '2026-10-15 00:00:00');
        $this->request('6644', 'accepted', $first->id, '2026-10-02 00:00:00', '2026-10-14 00:00:00');
        $this->migration()->up();

        $this->assertDatabaseHas('reserved_login_codes', [
            'login_code' => '6644', 'user_id' => null, 'department_id' => $first->id,
            'created_at' => '2026-10-14 00:00:00',
        ]);
    }

    public function test_backfilled_number_cannot_be_reused_for_account_or_student_in_another_department(): void
    {
        $original = Department::create(['name' => 'إدارة الطلب القديم']);
        $this->request('7454', 'accepted', $original->id);
        $this->migration()->up();

        try {
            app(AccountRegistrationService::class)->register([
                'name' => 'شخص مختلف جديد', 'loginCode' => '7454', 'password' => '12345678',
            ]);
            $this->fail('The old accepted number must not become a new registered account.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('loginCode', $exception->errors());
        }
        try {
            app(StudentAccountService::class)->create('معلم آخر جديد', '7454', 'male', '', null);
            $this->fail('The old accepted number must not become a new teacher.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('login_code', $exception->errors());
        }
        $this->assertDatabaseMissing('users', ['login_code' => '7454']);
        $this->assertDatabaseMissing('students', ['login_code' => '7454']);
        $this->assertDatabaseHas('reserved_login_codes', ['login_code' => '7454', 'department_id' => $original->id, 'user_id' => null]);
    }

    private function migration(): Migration
    {
        return require database_path('migrations/2026_10_16_020000_reserve_accepted_registration_login_codes.php');
    }

    private function request(
        ?string $loginCode,
        string $status,
        ?string $departmentId = null,
        string $createdAt = '2026-10-14 08:00:00',
        ?string $reviewedAt = '2026-10-15 09:00:00'
    ): void {
        DB::table('registration_requests')->insert([
            'id' => (string) Str::uuid(), 'department_id' => $departmentId ?? DepartmentContext::DEFAULT_ID,
            'full_name' => 'طلب تاريخي', 'login_code' => $loginCode, 'status' => $status,
            'created_at' => $createdAt, 'updated_at' => $createdAt, 'reviewed_at' => $reviewedAt,
        ]);
    }
}
