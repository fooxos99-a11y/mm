<?php

namespace Tests\Feature;

use App\Models\Archive;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Student;
use App\Models\User;
use App\Services\UserManagementService;
use App\Support\DepartmentContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use RuntimeException;

final class LegacyStudentAccountRecoveryTest extends CoreDataApiTestCase
{
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

    private function orphan(string $code, bool $reserve = true): Student
    {
        $student = Student::query()->create([
            'full_name' => 'Legacy learner', 'login_code' => $code,
            'branch_id' => Branch::query()->where('code', 'male')->value('id'), 'note' => 'Original note',
        ]);
        if ($reserve) {
            DB::table('reserved_login_codes')->insert([
                'login_code' => $code, 'user_id' => null, 'department_id' => DepartmentContext::id(), 'created_at' => now(),
            ]);
        }

        return $student;
    }

    public function test_normal_edit_restores_only_the_local_active_legacy_account_with_accepted_history(): void
    {
        $department = Department::query()->create(['name' => 'Recovery department', 'manager_title' => 'Manager']);
        DepartmentContext::set($department->id);
        $manager = User::factory()->create(['role' => 'admin', 'department_id' => $department->id]);
        Sanctum::actingAs($manager);
        $student = $this->orphan('671001');
        DB::table('registration_requests')->insert([
            'id' => (string) Str::uuid(), 'department_id' => $department->id, 'full_name' => $student->full_name,
            'login_code' => $student->login_code, 'branch_code' => 'male', 'status' => 'accepted',
            'student_id' => $student->id, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $archive = Archive::query()->create(['name' => 'Old result snapshot']);
        DB::table('final_exam_submissions')->insert([
            'id' => (string) Str::uuid(), 'department_id' => $department->id, 'archive_id' => $archive->id,
            'branch_code' => 'male', 'student_name' => $student->full_name, 'login_code' => $student->login_code,
        ]);

        $this->putJson('/api/students/'.$student->id, ['note' => 'Updated note'])->assertOk();
        $account = User::query()->where('login_code', '671001')->sole();
        $this->assertSame($department->id, $account->department_id);
        $this->assertSame('student', $account->role);
        $this->assertTrue($account->is_active);
        $this->assertNotEmpty($account->password);
        $this->assertDatabaseHas('students', ['id' => $student->id, 'note' => 'Updated note']);
        $this->assertDatabaseHas('reserved_login_codes', [
            'login_code' => '671001', 'user_id' => $account->id, 'department_id' => $department->id,
        ]);
    }

    public function test_restored_legacy_account_can_receive_a_password_and_log_in(): void
    {
        $student = $this->orphan('671002');
        $this->putJson('/api/students/'.$student->id, [
            'password' => '81726349', 'passwordConfirmation' => '81726349',
        ])->assertOk();
        $account = User::query()->where('login_code', '671002')->sole();
        $this->assertTrue(Hash::check('81726349', $account->password));
        $this->postJson('/api/auth/login', ['login_code' => '671002', 'password' => '81726349'])
            ->assertOk()->assertJsonPath('user.departmentId', DepartmentContext::DEFAULT_ID);
    }

    public function test_recovery_can_rename_the_login_and_return_to_its_own_previous_reservation(): void
    {
        $student = $this->orphan('671003');
        $this->putJson('/api/students/'.$student->id, ['loginCode' => '671004'])->assertOk();
        $account = User::query()->where('login_code', '671004')->sole();
        foreach (['671003', '671004'] as $code) {
            $this->assertDatabaseHas('reserved_login_codes', ['login_code' => $code, 'user_id' => $account->id]);
        }
        // An old snapshot does not override the actual reservation owned by this active account.
        $archive = Archive::query()->create(['name' => 'Old student snapshot']);
        Student::query()->create([
            'full_name' => 'Historical copy', 'login_code' => 'archive-recovery-copy', 'archived_login_code' => '671003',
            'branch_id' => $student->branch_id, 'archive_id' => $archive->id,
        ]);
        $this->putJson('/api/students/'.$student->id, ['loginCode' => '671003'])->assertOk();
        $this->assertSame($account->id, User::query()->where('login_code', '671003')->sole()->id);
        $this->assertSame('671003', $student->fresh()->login_code);
    }

    public function test_legacy_fixture_without_a_reservation_is_registered_during_recovery(): void
    {
        $student = $this->orphan('671005', false);
        $this->putJson('/api/students/'.$student->id, ['name' => 'Recovered learner'])->assertOk();
        $account = User::query()->where('login_code', '671005')->sole();
        $this->assertSame('Recovered learner', $account->full_name);
        $this->assertDatabaseHas('reserved_login_codes', ['login_code' => '671005', 'user_id' => $account->id]);
    }

    public function test_a_foreign_or_unassigned_reservation_cannot_be_adopted(): void
    {
        $other = Department::query()->create(['name' => 'Foreign reservation', 'manager_title' => 'Manager']);
        foreach ([$other->id, null] as $index => $origin) {
            $student = $this->orphan((string) (671010 + $index), false);
            DB::table('reserved_login_codes')->insert([
                'login_code' => $student->login_code, 'user_id' => null, 'department_id' => $origin, 'created_at' => now(),
            ]);
            $this->putJson('/api/students/'.$student->id, ['note' => 'Forbidden'])->assertUnprocessable();
            $this->assertSame('Original note', $student->fresh()->note);
            $this->assertDatabaseMissing('users', ['login_code' => $student->login_code]);
            $this->assertDatabaseHas('reserved_login_codes', ['login_code' => $student->login_code, 'user_id' => null, 'department_id' => $origin]);
        }
    }

    public function test_a_deleted_accounts_permanent_number_cannot_be_restored(): void
    {
        $deleted = User::factory()->create(['login_code' => '671012', 'role' => 'student']);
        $deleted->delete();
        $student = $this->orphan('671012', false);
        $this->putJson('/api/students/'.$student->id, ['password' => '81726349', 'passwordConfirmation' => '81726349'])
            ->assertUnprocessable();
        $this->assertDatabaseMissing('users', ['login_code' => '671012']);
        $this->assertDatabaseHas('reserved_login_codes', ['login_code' => '671012', 'user_id' => $deleted->id]);
    }

    public function test_a_provisional_number_originating_from_an_archived_student_cannot_be_reclaimed(): void
    {
        $student = $this->orphan('671013');
        $archive = Archive::query()->create(['name' => 'Reserved historical owner']);
        Student::query()->create([
            'full_name' => 'Archived learner', 'login_code' => 'archive-reserved-owner',
            'archived_login_code' => '671013', 'branch_id' => $student->branch_id, 'archive_id' => $archive->id,
        ]);
        $this->putJson('/api/students/'.$student->id, ['note' => 'Forbidden'])->assertUnprocessable();
        $this->assertDatabaseMissing('users', ['login_code' => '671013']);
        $this->assertDatabaseHas('reserved_login_codes', ['login_code' => '671013', 'user_id' => null]);
    }

    public function test_an_archived_student_is_never_reactivated_by_the_edit_endpoint(): void
    {
        $student = $this->orphan('671014');
        $archive = Archive::query()->create(['name' => 'Archived learner group']);
        $student->forceFill(['archive_id' => $archive->id])->save();
        $this->putJson('/api/students/'.$student->id, ['note' => 'Forbidden'])->assertNotFound();
        $this->assertDatabaseMissing('users', ['login_code' => '671014']);
        $this->assertDatabaseHas('students', ['id' => $student->id, 'archive_id' => $archive->id, 'note' => 'Original note']);
    }

    public function test_an_existing_foreign_or_privileged_user_is_never_taken_over(): void
    {
        $other = Department::query()->create(['name' => 'Protected user owner', 'manager_title' => 'Manager']);
        foreach ([['student', $other->id], ['admin', DepartmentContext::DEFAULT_ID]] as $index => [$role, $department]) {
            $code = (string) (671015 + $index);
            $user = User::factory()->create(['login_code' => $code, 'role' => $role, 'department_id' => $department]);
            $before = $user->fresh()->getAttributes();
            $student = $this->orphan($code, false);
            $this->putJson('/api/students/'.$student->id, ['password' => '81726349', 'passwordConfirmation' => '81726349'])
                ->assertUnprocessable();
            $this->assertSame($before, $user->fresh()->getAttributes());
            $this->assertSame('Original note', $student->fresh()->note);
        }
    }

    public function test_existing_learner_role_and_credentials_are_preserved_during_a_normal_edit(): void
    {
        $user = User::factory()->create(['login_code' => '671022', 'role' => 'trainee']);
        $student = $this->orphan('671022', false);
        $hash = $user->password;
        $this->putJson('/api/students/'.$student->id, ['note' => 'Allowed learner edit'])->assertOk();
        $this->assertSame('trainee', $user->fresh()->role);
        $this->assertSame($hash, $user->fresh()->password);
    }

    public function test_renaming_does_not_adopt_another_provisional_or_deleted_number(): void
    {
        $student = $this->orphan('671017');
        DB::table('reserved_login_codes')->insert([
            'login_code' => '671018', 'user_id' => null, 'department_id' => DepartmentContext::DEFAULT_ID, 'created_at' => now(),
        ]);
        $deleted = User::factory()->create(['login_code' => '671019', 'role' => 'student']);
        $deleted->delete();
        foreach (['671018', '671019'] as $code) {
            $this->putJson('/api/students/'.$student->id, ['loginCode' => $code])->assertUnprocessable();
            $this->assertDatabaseMissing('users', ['login_code' => $code]);
            $this->assertSame('671017', $student->fresh()->login_code);
            $this->assertDatabaseHas('reserved_login_codes', ['login_code' => '671017', 'user_id' => null]);
        }
    }

    public function test_a_failure_after_user_creation_rolls_back_both_reservations_and_student_changes(): void
    {
        $student = $this->orphan('671020');
        $dispatcher = User::getEventDispatcher();
        User::setEventDispatcher(clone $dispatcher);
        try {
            User::created(function (User $created): void {
                if ($created->login_code === '671021') {
                    throw new RuntimeException('Injected persistence failure');
                }
            });
            try {
                app(UserManagementService::class)->updateStudent($student, ['loginCode' => '671021', 'note' => 'Uncommitted']);
                $this->fail('The injected save failure must propagate.');
            } catch (RuntimeException $exception) {
                $this->assertSame('Injected persistence failure', $exception->getMessage());
            }
        } finally {
            User::setEventDispatcher($dispatcher);
        }
        $this->assertDatabaseMissing('users', ['login_code' => '671021']);
        $this->assertDatabaseMissing('reserved_login_codes', ['login_code' => '671021']);
        $this->assertDatabaseHas('reserved_login_codes', ['login_code' => '671020', 'user_id' => null]);
        $this->assertDatabaseHas('students', ['id' => $student->id, 'login_code' => '671020', 'note' => 'Original note']);
    }
}
