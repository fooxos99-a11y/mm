<?php

namespace Tests\Feature;

use App\Models\Archive;
use App\Models\Department;
use App\Models\User;
use App\Support\DepartmentContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class SharedArchiveAccessTest extends TestCase
{
    use RefreshDatabase;

    private string $firstDepartment;

    private string $secondDepartment;

    protected function setUp(): void
    {
        DepartmentContext::reset();
        parent::setUp();
        $this->firstDepartment = Department::create(['name' => 'إدارة الأرشيف الأولى', 'is_active' => true])->id;
        $this->secondDepartment = Department::create(['name' => 'إدارة الأرشيف الثانية', 'is_active' => true])->id;
    }

    protected function tearDown(): void
    {
        DepartmentContext::reset();
        parent::tearDown();
    }

    public function test_department_admin_reads_shared_archives_and_their_original_department_records(): void
    {
        $own = $this->archive($this->firstDepartment, 'دفعة الإدارة الأولى');
        $foreign = $this->archive($this->secondDepartment, 'دفعة الإدارة الثانية');
        $student = $this->student($this->secondDepartment, 'معلم سابق مشترك', 'male', $foreign->id);
        $course = $this->course($this->secondDepartment, 'دورة مؤرشفة مشتركة', 'course', $foreign->id);
        $this->parts($this->secondDepartment, $student, [1, 3]);
        Sanctum::actingAs($this->actor($this->firstDepartment));

        $response = $this->getJson('/api/dashboard/archives')->assertOk()->assertJsonCount(2);
        $archives = collect($response->json())->keyBy('id');
        $this->assertTrue($archives[$own->id]['can_manage']);
        $this->assertFalse($archives[$foreign->id]['can_manage']);
        $this->assertSame('إدارة الأرشيف الثانية', $archives[$foreign->id]['department_name']);
        $this->getJson('/api/dashboard/archives/'.$foreign->id)->assertOk()
            ->assertJsonPath('archive.can_manage', false)
            ->assertJsonPath('archive.department_name', 'إدارة الأرشيف الثانية')
            ->assertJsonPath('students.0.id', $student)
            ->assertJsonPath('courses.0.id', $course);
        $this->getJson('/api/dashboard/archives/'.$foreign->id.'/students/'.$student)->assertOk()
            ->assertJsonPath('archive.id', $foreign->id)
            ->assertJsonPath('student.name', 'معلم سابق مشترك')
            ->assertJsonPath('student.completedParts', [1, 3])
            ->assertJsonPath('courses.0.id', $course);

        $this->getJson('/api/dashboard/archives/'.$own->id.'/students/'.$student)->assertNotFound();
    }

    public function test_shared_student_search_excludes_active_people_and_keeps_the_original_archive(): void
    {
        $own = $this->archive($this->firstDepartment, 'أرشيف البحث الأول');
        $foreign = $this->archive($this->secondDepartment, 'أرشيف البحث الثاني');
        $ownStudent = $this->student($this->firstDepartment, 'معلم البحث الأول', 'male', $own->id);
        $foreignStudent = $this->student($this->secondDepartment, 'معلم البحث الثاني', 'female', $foreign->id);
        $active = $this->student($this->secondDepartment, 'معلم البحث النشط', 'male');
        Sanctum::actingAs($this->actor($this->firstDepartment));

        $response = $this->getJson('/api/dashboard/archives/search/students?name='.urlencode('معلم البحث'))
            ->assertOk()->assertJsonCount(2);
        $students = collect($response->json())->keyBy('id');
        $this->assertEqualsCanonicalizing([$ownStudent, $foreignStudent], $students->keys()->all());
        $this->assertSame($foreign->id, $students[$foreignStudent]['archive_id']);
        $this->assertSame('أرشيف البحث الثاني', $students[$foreignStudent]['archive_name']);
        $this->assertSame('female', $students[$foreignStudent]['branch']['id']);
        $this->getJson('/api/dashboard/archives/'.$foreign->id.'/students/'.$active)->assertNotFound();
    }

    public function test_shared_details_include_archived_answers_and_scores_without_exposing_live_department_data(): void
    {
        $archive = $this->archive($this->secondDepartment, 'أرشيف نتائج كامل');
        $student = $this->student($this->secondDepartment, 'معلم له نتائج مؤرشفة', 'male', $archive->id);
        $course = $this->course($this->secondDepartment, 'دورة لها نتائج مؤرشفة', 'course', $archive->id);
        $question = (string) Str::uuid();
        $submission = (string) Str::uuid();
        $login = DB::table('students')->where('id', $student)->value('login_code');
        $scope = ['archive_id' => $archive->id, 'department_id' => $this->secondDepartment];
        DB::table('course_questions')->insert([
            'id' => $question, 'course_id' => $course, 'assessment_type' => 'pre',
            'question_type' => 'text', 'prompt' => 'سؤال محفوظ', ...$scope,
        ]);
        DB::table('course_submissions')->insert([
            'id' => $submission, 'course_id' => $course, 'assessment_type' => 'pre',
            'student_id' => $student, 'student_name' => 'معلم له نتائج مؤرشفة',
            'login_code' => $login, 'manual_score' => 88, ...$scope,
        ]);
        DB::table('course_submission_answers')->insert([
            'id' => (string) Str::uuid(), 'submission_id' => $submission,
            'question_id' => $question, 'answer_text' => 'إجابة محفوظة', ...$scope,
        ]);
        DB::table('course_attendance')->insert([
            'id' => (string) Str::uuid(), 'course_id' => $course, 'student_id' => $student,
            'student_name' => 'معلم له نتائج مؤرشفة', 'login_code' => $login, ...$scope,
        ]);
        $activeStudent = $this->student($this->secondDepartment, 'معلم نشط يبقى خاصًا', 'male');
        $activeCourse = $this->course($this->secondDepartment, 'دورة نشطة تبقى خاصة');
        Sanctum::actingAs($this->actor($this->firstDepartment));

        $this->getJson('/api/dashboard/archives/'.$archive->id.'/students/'.$student)->assertOk()
            ->assertJsonPath('summary.preTests', 1)->assertJsonPath('summary.attendance', 1)
            ->assertJsonPath('courses.0.pre.manualScore', 88)
            ->assertJsonPath('courses.0.pre.answers.0.value', 'إجابة محفوظة');
        $this->getJson('/api/dashboard/snapshot')->assertOk()
            ->assertJsonMissing(['name' => 'معلم نشط يبقى خاصًا'])
            ->assertJsonMissing(['title' => 'دورة نشطة تبقى خاصة']);
        $this->getJson('/api/dashboard/archives/'.$archive->id.'/students/'.$activeStudent)->assertNotFound();
        $this->deleteJson('/api/dashboard/courses/'.$activeCourse)->assertNotFound();
        $this->assertDatabaseHas('courses', ['id' => $activeCourse, 'archive_id' => null]);
    }

    public function test_foreign_archives_are_read_only_for_other_department_admins(): void
    {
        $foreign = $this->archive($this->secondDepartment, 'أرشيف محمي من التعديل');
        $student = $this->student($this->secondDepartment, 'معلم محفوظ', 'male', $foreign->id);
        Sanctum::actingAs($this->actor($this->firstDepartment));

        $response = $this->postJson('/api/dashboard/archives/'.$foreign->id.'/students', ['name' => 'إضافة غير مصرح بها']);
        $this->assertContains($response->status(), [403, 404]);
        $response = $this->deleteJson('/api/dashboard/archives/'.$foreign->id);
        $this->assertContains($response->status(), [403, 404]);
        $this->assertDatabaseHas('archives', ['id' => $foreign->id, 'department_id' => $this->secondDepartment]);
        $this->assertDatabaseHas('students', ['id' => $student, 'archive_id' => $foreign->id]);
        $this->assertDatabaseMissing('students', ['full_name' => 'إضافة غير مصرح بها']);
    }

    public function test_archive_owner_can_assign_and_delete_without_affecting_other_archives(): void
    {
        $own = $this->archive($this->firstDepartment, 'أرشيف يملكه المسؤول');
        $foreign = $this->archive($this->secondDepartment, 'أرشيف يبقى محفوظًا');
        Sanctum::actingAs($this->actor($this->firstDepartment));

        $response = $this->postJson('/api/dashboard/archives/'.$own->id.'/students', ['name' => 'معلم مضاف يدويًا'])
            ->assertOk();
        $student = $response->json('student.id');
        $this->assertDatabaseHas('students', [
            'id' => $student, 'archive_id' => $own->id, 'department_id' => $this->firstDepartment,
        ]);
        $this->deleteJson('/api/dashboard/archives/'.$own->id)->assertOk();
        $this->assertDatabaseMissing('archives', ['id' => $own->id]);
        $this->assertDatabaseMissing('students', ['id' => $student]);
        $this->assertDatabaseHas('archives', ['id' => $foreign->id]);
    }

    public function test_general_manager_can_manage_an_archive_from_another_selected_department(): void
    {
        $archive = $this->archive($this->firstDepartment, 'أرشيف متاح للمدير العام');
        Sanctum::actingAs(User::factory()->create(['role' => 'super_admin', 'department_id' => null]));
        $this->withHeader('X-Department-Id', $this->secondDepartment);

        $this->getJson('/api/dashboard/archives/'.$archive->id)->assertOk()
            ->assertJsonPath('archive.can_manage', true)
            ->assertJsonPath('archive.department_name', 'إدارة الأرشيف الأولى');
        $listed = $this->getJson('/api/dashboard/archives')->assertOk()->json();
        $this->assertTrue(collect($listed)->firstWhere('id', $archive->id)['can_manage']);
        $response = $this->postJson('/api/dashboard/archives/'.$archive->id.'/students', ['name' => 'إضافة المدير العام'])
            ->assertOk();
        $this->assertDatabaseHas('students', [
            'id' => $response->json('student.id'), 'archive_id' => $archive->id,
            'department_id' => $this->firstDepartment,
        ]);
        $this->deleteJson('/api/dashboard/archives/'.$archive->id)->assertOk();
        $this->assertDatabaseMissing('archives', ['id' => $archive->id]);
    }

    public function test_guests_cannot_read_shared_archives_or_their_student_details(): void
    {
        $archive = $this->archive($this->firstDepartment, 'أرشيف خاص بالمسؤولين');
        $student = $this->student($this->firstDepartment, 'معلم لا يظهر للعامة', 'male', $archive->id);
        foreach ($this->readUrls($archive->id, $student) as $url) {
            $this->getJson($url)->assertUnauthorized();
        }
    }

    public function test_branch_managers_and_students_cannot_read_or_mutate_shared_archives(): void
    {
        $archive = $this->archive($this->firstDepartment, 'أرشيف لا تفتحه صلاحيات الفروع');
        $student = $this->student($this->firstDepartment, 'معلم مؤرشف محمي', 'male', $archive->id);
        foreach (['male_manager', 'female_manager', 'student'] as $role) {
            Sanctum::actingAs($this->actor($this->firstDepartment, $role));
            foreach ($this->readUrls($archive->id, $student) as $url) {
                $this->getJson($url)->assertForbidden();
            }
            $this->postJson('/api/dashboard/archives/'.$archive->id.'/students', ['name' => 'إضافة ممنوعة'])
                ->assertForbidden();
            $this->deleteJson('/api/dashboard/archives/'.$archive->id)->assertForbidden();
        }
        $this->assertDatabaseHas('archives', ['id' => $archive->id]);
        $this->assertDatabaseMissing('students', ['full_name' => 'إضافة ممنوعة']);
    }

    public function test_admin_of_an_inactive_department_cannot_read_the_shared_archive(): void
    {
        $archive = $this->archive($this->firstDepartment, 'أرشيف إدارة نشطة');
        Sanctum::actingAs($this->actor($this->secondDepartment));
        DB::table('departments')->where('id', $this->secondDepartment)->update(['is_active' => false]);

        $this->getJson('/api/dashboard/archives')->assertNotFound();
        $this->getJson('/api/dashboard/archives/'.$archive->id)->assertNotFound();
    }

    public function test_manual_archive_saves_all_snapshot_counts_and_defaults_omitted_new_counts_to_zero(): void
    {
        Sanctum::actingAs($this->actor($this->firstDepartment));
        $counts = [
            'courses_count' => 4, 'tasks_count' => 3, 'male_teachers_count' => 20,
            'female_teachers_count' => 15, 'completed_parts_count' => 72,
        ];
        $response = $this->postJson('/api/dashboard/archives', [
            'name' => 'دفعة تاريخية بإحصاء يدوي', 'batch_type' => 'all', ...$counts,
        ])->assertCreated();
        foreach ($counts as $field => $value) {
            $response->assertJsonPath($field, $value);
        }
        $this->assertDatabaseHas('archives', ['id' => $response->json('id'), ...$counts]);

        $response = $this->postJson('/api/dashboard/archives', [
            'name' => 'دفعة تاريخية دون إحصاءات إضافية', 'batch_type' => 'all',
        ])->assertCreated();
        foreach (array_keys($counts) as $field) {
            $response->assertJsonPath($field, 0);
        }
    }

    public function test_manual_archive_rejects_negative_and_fractional_counts_without_writing_any_archive(): void
    {
        Sanctum::actingAs($this->actor($this->firstDepartment));
        $fields = ['courses_count', 'tasks_count', 'male_teachers_count', 'female_teachers_count', 'completed_parts_count'];
        foreach ([-1, 1.5] as $invalid) {
            $this->postJson('/api/dashboard/archives', [
                'name' => 'أرشيف أعداد غير صالحة', 'batch_type' => 'all', ...array_fill_keys($fields, $invalid),
            ])->assertUnprocessable()->assertJsonValidationErrors($fields);
        }
        $this->assertDatabaseMissing('archives', ['name' => 'أرشيف أعداد غير صالحة']);
    }

    public function test_archiving_snapshots_only_the_current_department_active_batch_and_keeps_counts_stable(): void
    {
        $old = $this->archive($this->firstDepartment, 'دفعة سابقة مستبعدة');
        $oldStudent = $this->student($this->firstDepartment, 'معلم دفعة سابقة', 'male', $old->id);
        $this->parts($this->firstDepartment, $oldStudent, [1, 2, 3]);
        $this->course($this->firstDepartment, 'دورة سابقة مستبعدة', 'course', $old->id);
        $male = $this->student($this->firstDepartment, 'معلم أول في الدفعة', 'male');
        $secondMale = $this->student($this->firstDepartment, 'معلم ثان في الدفعة', 'male');
        $female = $this->student($this->firstDepartment, 'معلمة في الدفعة', 'female');
        $this->parts($this->firstDepartment, $male, [1, 2]);
        $this->parts($this->firstDepartment, $secondMale, [1]);
        $this->parts($this->firstDepartment, $female, [5]);
        $this->course($this->firstDepartment, 'دورة أولى في الدفعة');
        $this->course($this->firstDepartment, 'دورة ثانية في الدفعة');
        $this->course($this->firstDepartment, 'مهمة أدائية في الدفعة', 'task');
        $foreign = $this->student($this->secondDepartment, 'معلم الإدارة الأخرى', 'male');
        $this->parts($this->secondDepartment, $foreign, [1, 2, 3, 4]);
        $foreignCourse = $this->course($this->secondDepartment, 'دورة الإدارة الأخرى');
        Sanctum::actingAs($this->actor($this->firstDepartment));

        $response = $this->postJson('/api/dashboard/archives/archive-all', [
            'name' => 'دفعة بإحصاءات محسوبة', 'batch_type' => 'all',
        ])->assertOk();
        $counts = [
            'courses_count' => 2, 'tasks_count' => 1, 'male_teachers_count' => 2,
            'female_teachers_count' => 1, 'completed_parts_count' => 4,
        ];
        foreach ($counts as $field => $value) {
            $response->assertJsonPath('archive.'.$field, $value);
        }
        $archiveId = $response->json('archive.id');
        $this->assertDatabaseHas('archives', ['id' => $archiveId, 'department_id' => $this->firstDepartment, ...$counts]);
        $this->assertSame(3, DB::table('students')->where('archive_id', $archiveId)->count());
        $this->assertDatabaseHas('students', ['id' => $foreign, 'archive_id' => null]);
        $this->assertDatabaseHas('courses', ['id' => $foreignCourse, 'archive_id' => null, 'is_active' => true]);
        $this->assertDatabaseHas('students', ['id' => $oldStudent, 'archive_id' => $old->id]);

        $newStudent = $this->student($this->firstDepartment, 'معلم في الدفعة التالية', 'male');
        $this->parts($this->firstDepartment, $newStudent, [1, 2, 3]);
        $this->getJson('/api/dashboard/archives/'.$archiveId)->assertOk()
            ->assertJsonPath('archive.completed_parts_count', 4)
            ->assertJsonPath('archive.male_teachers_count', 2);
    }

    public function test_branch_archive_counts_only_selected_teachers_and_their_completed_parts(): void
    {
        $male = $this->student($this->firstDepartment, 'معلم الدفعة المحددة', 'male');
        $female = $this->student($this->firstDepartment, 'معلمة تبقى نشطة', 'female');
        $this->parts($this->firstDepartment, $male, [1, 2]);
        $this->parts($this->firstDepartment, $female, [1, 2, 3]);
        $this->course($this->firstDepartment, 'دورة الدفعة المحددة');
        $this->course($this->firstDepartment, 'مهمة الدفعة المحددة', 'task');
        Sanctum::actingAs($this->actor($this->firstDepartment));

        $response = $this->postJson('/api/dashboard/archives/archive-all', [
            'name' => 'أرشيف المعلمين فقط', 'batch_type' => 'male',
        ])->assertOk()->assertJsonPath('archive.courses_count', 1)
            ->assertJsonPath('archive.tasks_count', 1)
            ->assertJsonPath('archive.male_teachers_count', 1)
            ->assertJsonPath('archive.female_teachers_count', 0)
            ->assertJsonPath('archive.completed_parts_count', 2);
        $this->assertDatabaseHas('students', ['id' => $male, 'archive_id' => $response->json('archive.id')]);
        $this->assertDatabaseHas('students', ['id' => $female, 'archive_id' => null]);
    }

    public function test_summary_migration_backfills_existing_archives_and_preserves_manual_counts_on_rerun(): void
    {
        $manual = $this->archive($this->firstDepartment, 'دفعة بإحصاء دورات تاريخي');
        DB::table('archives')->where('id', $manual->id)->update(['courses_count' => 19]);
        $automatic = $this->archive($this->secondDepartment, 'دفعة قديمة دون إحصاء');
        $male = $this->student($this->firstDepartment, 'معلم تاريخي', 'male', $manual->id);
        $this->student($this->firstDepartment, 'معلمة تاريخية', 'female', $manual->id);
        $foreign = $this->student($this->secondDepartment, 'معلم تاريخي آخر', 'male', $automatic->id);
        $this->parts($this->firstDepartment, $male, [1, 2]);
        $this->parts($this->secondDepartment, $foreign, [1]);
        $this->course($this->firstDepartment, 'دورة تاريخية', 'course', $manual->id);
        $this->course($this->firstDepartment, 'مهمة تاريخية', 'task', $manual->id);
        $this->course($this->secondDepartment, 'دورة تاريخية أخرى', 'course', $automatic->id);
        $this->course($this->firstDepartment, 'مهمة نشطة لا تدخل الأرشيف', 'task');
        $migration = require database_path('migrations/2026_10_18_000000_add_archive_summary_counts.php');
        $migration->down();
        $migration->up();

        $this->assertDatabaseHas('archives', [
            'id' => $manual->id, 'courses_count' => 19, 'tasks_count' => 1,
            'male_teachers_count' => 1, 'female_teachers_count' => 1, 'completed_parts_count' => 2,
        ]);
        $this->assertDatabaseHas('archives', [
            'id' => $automatic->id, 'courses_count' => 1, 'tasks_count' => 0,
            'male_teachers_count' => 1, 'female_teachers_count' => 0, 'completed_parts_count' => 1,
        ]);
        DB::table('archives')->where('id', $manual->id)->update(['tasks_count' => 27]);
        $migration->up();
        $this->assertDatabaseHas('archives', ['id' => $manual->id, 'tasks_count' => 27, 'courses_count' => 19]);
    }

    private function actor(string $department, string $role = 'admin'): User
    {
        return User::factory()->create(['department_id' => $department, 'role' => $role]);
    }

    private function archive(string $department, string $name): Archive
    {
        return DepartmentContext::run($department, fn () => Archive::create([
            'name' => $name, 'courses_count' => 0, 'batch_type' => 'all',
        ]));
    }

    private function student(string $department, string $name, string $branch, ?string $archive = null): string
    {
        $id = (string) Str::uuid();
        DB::table('students')->insert([
            'id' => $id, 'department_id' => $department, 'full_name' => $name,
            'login_code' => 'shared-'.Str::uuid(), 'branch_id' => DB::table('branches')->where('code', $branch)->value('id'),
            'archive_id' => $archive, 'created_at' => now(),
        ]);

        return $id;
    }

    private function parts(string $department, string $student, array $parts): void
    {
        foreach ($parts as $part) {
            DB::table('student_parts')->insert([
                'student_id' => $student, 'department_id' => $department, 'part_number' => $part, 'marked_at' => now(),
            ]);
        }
    }

    private function course(string $department, string $title, string $type = 'course', ?string $archive = null): string
    {
        $id = (string) Str::uuid();
        DB::table('courses')->insert([
            'id' => $id, 'department_id' => $department, 'title' => $title, 'entity_type' => $type,
            'is_active' => true, 'archive_id' => $archive, 'created_at' => now(),
        ]);

        return $id;
    }

    private function readUrls(string $archive, string $student): array
    {
        return [
            '/api/dashboard/archives',
            '/api/dashboard/archives/search/students?name='.urlencode('معلم'),
            '/api/dashboard/archives/'.$archive,
            '/api/dashboard/archives/'.$archive.'/students/'.$student,
        ];
    }
}
