<?php

namespace Tests\Feature;

use App\Models\Archive;
use App\Models\Department;
use App\Models\User;
use App\Support\DepartmentContext;
use App\Support\DepartmentData;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class DepartmentDataIsolationTest extends TestCase
{
    use RefreshDatabase;

    private string $otherDepartment;

    protected function setUp(): void
    {
        DepartmentContext::reset();
        parent::setUp();
        $this->otherDepartment = Department::create(['name' => 'الإدارة الثانية'])->id;
    }

    protected function tearDown(): void
    {
        DepartmentContext::reset();
        parent::tearDown();
    }

    public function test_raw_queries_stamp_scope_and_protect_top_level_or_after_builder_reuse(): void
    {
        $own = $this->course('own');
        $foreign = DepartmentContext::run($this->otherDepartment, fn () => $this->course('foreign'));
        $query = DepartmentData::table('courses')->where('id', $own);
        $this->assertCount(1, $query->get());
        $this->assertCount(1, $query->orWhere('id', $foreign)->get());
        $this->assertSame(DepartmentContext::DEFAULT_ID, DB::table('courses')->where('id', $own)->value('department_id'));
        $this->assertSame(1, $query->update(['title' => 'updated']));
        $this->assertSame('foreign', DB::table('courses')->where('id', $foreign)->value('title'));
        $this->assertSame(1, $query->delete());
        $this->assertTrue(DB::table('courses')->where('id', $foreign)->exists());
    }

    public function test_alias_and_left_join_do_not_expose_rows_from_another_department(): void
    {
        $own = $this->course('own');
        $foreign = DepartmentContext::run($this->otherDepartment, fn () => $this->course('foreign'));
        // Deliberately malformed legacy association: ON must reject the foreign question.
        DB::table('course_questions')->insert([
            'id' => (string) Str::uuid(), 'course_id' => $own, 'department_id' => $this->otherDepartment,
            'assessment_type' => 'pre', 'question_type' => 'text', 'prompt' => 'private',
        ]);

        $rows = DepartmentData::table('courses as c')->leftJoin('course_questions as q', 'q.course_id', '=', 'c.id')
            ->where('c.id', $own)->orWhere('c.id', $foreign)->get(['c.id', 'q.prompt']);
        $this->assertCount(1, $rows);
        $this->assertNull($rows[0]->prompt);
    }

    public function test_nested_exists_scalar_subquery_and_union_are_scoped_with_their_bindings(): void
    {
        $own = $this->course('own');
        DepartmentContext::run($this->otherDepartment, fn () => $this->course('foreign'));
        $query = DepartmentData::table('courses')->whereExists(fn ($query) => $query->selectRaw('1')
            ->from('courses as nested')->where('nested.title', 'foreign'));
        $this->assertSame(0, $query->count());
        $this->assertSame(0, DepartmentData::table('courses')->where('title', '=', fn ($query) => $query
            ->select('title')->from('courses as nested')->where('nested.title', 'foreign')->limit(1))->count());
        $rows = DepartmentData::table('courses')->select('id')->where('id', $own)
            ->union(fn ($query) => $query->select('id')->from('courses')->where('title', 'foreign'))->get();
        $this->assertCount(1, $rows);
    }

    public function test_model_scope_and_same_archive_name_are_independent(): void
    {
        Archive::create(['name' => 'الدفعة الأولى']);
        DepartmentContext::run($this->otherDepartment, fn () => Archive::create(['name' => 'الدفعة الأولى']));
        $this->assertSame(1, Archive::count());
        $this->assertSame(2, DepartmentContext::withoutScope(fn () => Archive::count()));
    }

    public function test_settings_upsert_and_update_or_insert_are_per_department(): void
    {
        DepartmentData::table('app_settings')->updateOrInsert(['setting_key' => 'test'], ['value' => 'first']);
        DepartmentContext::run($this->otherDepartment, function (): void {
            DepartmentData::table('app_settings')->upsert([
                ['setting_key' => 'test', 'value' => 'second'],
            ], ['setting_key'], ['value']);
            DepartmentData::table('app_settings')->upsert([
                ['setting_key' => 'test', 'value' => 'third'],
            ], ['setting_key'], ['value']);
        });
        $this->assertSame('first', DepartmentData::table('app_settings')->where('setting_key', 'test')->value('value'));
        $this->assertSame('third', DepartmentContext::run($this->otherDepartment,
            fn () => DepartmentData::table('app_settings')->where('setting_key', 'test')->value('value')));
    }

    public function test_null_context_cannot_read_or_write_department_data(): void
    {
        $this->course('own');
        DepartmentContext::set(null);
        $this->assertSame(0, DepartmentData::table('courses')->count());
        $this->expectException(ValidationException::class);
        $this->course('blocked');
    }

    public function test_explicit_foreign_department_write_is_rejected(): void
    {
        $this->expectException(ValidationException::class);
        DepartmentData::table('courses')->insert([
            'id' => (string) Str::uuid(), 'title' => 'blocked', 'department_id' => $this->otherDepartment,
        ]);
    }

    public function test_foreign_parent_reference_is_rejected(): void
    {
        $foreign = DepartmentContext::run($this->otherDepartment, fn () => $this->course('foreign'));
        $this->expectException(ValidationException::class);
        DepartmentData::table('course_questions')->insert([
            'id' => (string) Str::uuid(), 'course_id' => $foreign, 'assessment_type' => 'pre',
            'question_type' => 'text', 'prompt' => 'blocked',
        ]);
    }

    public function test_login_numbers_are_unique_across_departments_and_remain_reserved_after_delete(): void
    {
        $user = User::factory()->create(['login_code' => '924']);
        $this->assertSame(DepartmentContext::DEFAULT_ID, $user->department_id);
        $user->delete();
        DepartmentContext::set($this->otherDepartment);
        $this->expectException(ValidationException::class);
        User::factory()->create(['login_code' => '924']);
    }

    public function test_unassigned_account_is_retained_and_reservation_is_idempotent_for_owner(): void
    {
        $user = User::factory()->create(['login_code' => '1483', 'department_id' => null]);
        $this->assertNull($user->department_id);
        DepartmentData::reserveLoginCode('1483', $user->id);
        DepartmentData::reserveLoginCode('new-archived-number');
        $this->assertDatabaseHas('reserved_login_codes', ['login_code' => '1483', 'user_id' => $user->id]);
    }

    public function test_unknown_number_reservation_is_idempotent_only_in_its_originating_department(): void
    {
        DepartmentData::reserveLoginCode('legacy-import-924');
        DepartmentData::reserveLoginCode('legacy-import-924');
        $this->assertDatabaseHas('reserved_login_codes', [
            'login_code' => 'legacy-import-924', 'user_id' => null, 'department_id' => DepartmentContext::DEFAULT_ID,
        ]);
        DepartmentContext::set($this->otherDepartment);
        $this->expectException(ValidationException::class);
        DepartmentData::reserveLoginCode('legacy-import-924');
    }

    public function test_account_origin_is_assigned_once_and_does_not_move_with_later_department_changes(): void
    {
        $user = User::factory()->create(['department_id' => null]);
        $this->assertDatabaseHas('reserved_login_codes', ['user_id' => $user->id, 'department_id' => null]);
        $user->forceFill(['department_id' => DepartmentContext::DEFAULT_ID])->save();
        $user->forceFill(['department_id' => $this->otherDepartment])->save();
        $this->assertDatabaseHas('reserved_login_codes', [
            'user_id' => $user->id, 'department_id' => DepartmentContext::DEFAULT_ID,
        ]);
    }

    public function test_registry_origin_migration_backfills_unknown_historical_imports(): void
    {
        $migration = require database_path('migrations/2026_10_16_010000_scope_reserved_login_codes_to_department.php');
        $migration->down();
        $course = $this->course('legacy course');
        DB::table('course_submissions')->insert([
            'id' => (string) Str::uuid(), 'course_id' => $course, 'assessment_type' => 'pre',
            'student_name' => 'قديم بلا حساب', 'login_code' => 'old-unregistered-login',
        ]);
        $migration->up();
        $this->assertDatabaseHas('reserved_login_codes', [
            'login_code' => 'old-unregistered-login', 'user_id' => null, 'department_id' => DepartmentContext::DEFAULT_ID,
        ]);
    }

    public function test_scope_restores_after_exception_and_captured_query_does_not_change_department(): void
    {
        $this->course('own');
        $query = DepartmentData::table('courses');
        DepartmentContext::set($this->otherDepartment);
        $this->assertSame(1, $query->count());
        try {
            DepartmentContext::withoutScope(fn () => throw new \RuntimeException('test'));
        } catch (\RuntimeException) {
            $this->assertFalse(DepartmentContext::isUnscoped());
        }
    }

    private function course(string $title): string
    {
        $id = (string) Str::uuid();
        DepartmentData::table('courses')->insert(['id' => $id, 'title' => $title]);

        return $id;
    }
}
