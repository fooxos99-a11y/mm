<?php

namespace Tests\Feature;

use App\Models\Archive;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Student;
use App\Models\User;
use App\Support\DepartmentContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class ManagementRecordsTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        DepartmentContext::reset();
        parent::tearDown();
    }

    private function root(): void
    {
        DepartmentContext::reset();
        Sanctum::actingAs(User::factory()->create(['role' => 'super_admin', 'department_id' => null]));
    }

    private function student(string $name, string $code, ?string $department = null, ?string $archive = null): Student
    {
        return DepartmentContext::run($department ?? DepartmentContext::DEFAULT_ID, fn () => Student::create([
            'full_name' => $name, 'login_code' => $code, 'archived_login_code' => $archive ? 'old-'.$code : null,
            'department_id' => $department ?? DepartmentContext::DEFAULT_ID, 'archive_id' => $archive,
            'branch_id' => Branch::query()->where('code', 'male')->value('id'),
        ]));
    }

    public function test_current_batch_automatically_lists_names_and_login_numbers_across_departments(): void
    {
        $other = Department::create(['name' => 'الإدارة الثانية']);
        $this->student('معلم الدفعة الحالية', '940001');
        $this->student('معلم الإدارة الثانية', '940002', $other->id);
        $archive = Archive::create(['name' => 'دفعة قديمة']);
        $this->student('معلم مؤرشف', '940003', null, $archive->id);
        $this->root();

        $this->getJson('/api/management/records')->assertOk()->assertJsonPath('pagination.total', 2)
            ->assertJsonFragment(['full_name' => 'معلم الدفعة الحالية', 'login_code' => '940001'])
            ->assertJsonFragment(['departmentName' => 'الإدارة الثانية'])
            ->assertJsonMissing(['full_name' => 'معلم مؤرشف']);
    }

    public function test_department_batch_name_and_original_login_search_filters_are_applied_together(): void
    {
        $other = Department::create(['name' => 'إدارة أخرى']);
        $archive = Archive::create(['name' => 'دفعة العام السابق']);
        $record = $this->student('معلم سابق', '940004', null, $archive->id);
        $this->student('معلم حالي', '940005', $other->id);
        $this->student('مشارك دون صفر', '981111', $other->id);
        $this->root();
        $this->getJson('/api/management/records?batch=all')->assertOk()->assertJsonPath('pagination.total', 3);
        $query = http_build_query(['batch' => 'archived', 'archiveId' => $archive->id, 'departmentId' => DepartmentContext::DEFAULT_ID, 'search' => 'old-940004']);
        $this->getJson('/api/management/records?'.$query)->assertOk()->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('students.0.id', $record->id)->assertJsonPath('students.0.login_code', 'old-940004');
        $this->getJson('/api/management/records?batch=all&departmentId='.$other->id)->assertOk()->assertJsonPath('pagination.total', 2);
        $this->getJson('/api/management/records?batch=all&search=0&departmentId='.$other->id)->assertOk()->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('students.0.full_name', 'معلم حالي');
        $this->getJson('/api/management/records?batch=all&search=absent')->assertOk()->assertJsonPath('pagination.total', 0);
    }

    public function test_records_are_paginated_and_invalid_filters_are_rejected(): void
    {
        foreach (range(1, 26) as $index) {
            $this->student('معلم '.$index, '9500'.$index);
        }
        $this->root();
        $first = $this->getJson('/api/management/records')->assertOk()->assertJsonCount(25, 'students')->assertJsonPath('pagination.lastPage', 2);
        $last = $this->getJson('/api/management/records?page=2')->assertOk()->assertJsonCount(1, 'students');
        $this->assertNotContains($last->json('students.0.id'), array_column($first->json('students'), 'id'));
        $this->getJson('/api/management/records?page=99')->assertOk()->assertJsonPath('pagination.page', 2)->assertJsonCount(1, 'students');
        foreach (['page=0', 'batch=unknown', 'departmentId=wrong', 'archiveId=wrong'] as $query) {
            $this->getJson('/api/management/records?'.$query)->assertUnprocessable();
        }
    }

    public function test_current_detail_reuses_the_record_view_without_reading_foreign_department_or_archived_courses(): void
    {
        $other = Department::create(['name' => 'إدارة السجل']);
        $student = $this->student('معلم حالي آخر', '940006', $other->id);
        DB::table('courses')->insert(['id' => (string) Str::uuid(), 'department_id' => $other->id, 'title' => 'دورة الإدارة الصحيحة']);
        DB::table('courses')->insert(['id' => (string) Str::uuid(), 'department_id' => DepartmentContext::DEFAULT_ID, 'title' => 'دورة إدارة مختلفة']);
        $otherArchive = DepartmentContext::run($other->id, fn () => Archive::create(['name' => 'دفعة إدارة السجل السابقة']));
        DB::table('courses')->insert(['id' => (string) Str::uuid(), 'department_id' => $other->id, 'archive_id' => $otherArchive->id, 'title' => 'دورة مؤرشفة']);
        $archive = Archive::create(['name' => 'دفعة محفوظة']);
        $old = $this->student('معلم سابق', '940007', null, $archive->id);
        $this->root();
        $this->getJson('/api/management/students/'.$student->id)->assertOk()
            ->assertJsonPath('archive.id', null)->assertJsonPath('archive.name', 'الدفعة الحالية')
            ->assertJsonPath('student.name', 'معلم حالي آخر')->assertJsonPath('student.loginCode', '940006')
            ->assertJsonFragment(['title' => 'دورة الإدارة الصحيحة'])->assertJsonMissing(['title' => 'دورة إدارة مختلفة'])
            ->assertJsonMissing(['title' => 'دورة مؤرشفة']);
        $this->getJson('/api/management/students/'.$old->id)->assertNotFound();
        $this->getJson('/api/management/archives/'.$archive->id.'/students/'.$student->id)->assertNotFound();
        $this->getJson('/api/management/archives/'.$archive->id.'/students/'.$old->id)->assertOk()->assertJsonPath('student.name', 'معلم سابق');
    }

    public function test_ordinary_accounts_and_guests_cannot_read_central_records_or_current_student_details(): void
    {
        $student = $this->student('سجل خاص', '940008');
        $this->getJson('/api/management/records')->assertUnauthorized();
        $this->getJson('/api/management/students/'.$student->id)->assertUnauthorized();
        foreach (['admin', 'student', 'unassigned'] as $role) {
            Sanctum::actingAs(User::factory()->create(['role' => $role]));
            $this->withHeader('X-Department-Id', DepartmentContext::DEFAULT_ID)->getJson('/api/management/records')->assertForbidden();
            $this->getJson('/api/management/students/'.$student->id)->assertForbidden();
        }
    }

    public function test_malformed_foreign_archive_relationship_is_not_exposed_in_the_directory(): void
    {
        $other = Department::create(['name' => 'إدارة مختلفة']);
        $archive = Archive::create(['name' => 'أرشيف الإدارة الأصلية']);
        DB::table('students')->insert([
            'id' => (string) Str::uuid(), 'full_name' => 'ربط تاريخي غير صالح', 'login_code' => '940009',
            'department_id' => $other->id, 'archive_id' => $archive->id,
            'branch_id' => Branch::query()->where('code', 'male')->value('id'),
        ]);
        $this->root();
        $this->getJson('/api/management/records?batch=all')->assertOk()->assertJsonPath('pagination.total', 0);
    }
}
