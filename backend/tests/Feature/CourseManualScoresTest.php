<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use App\Services\CourseQuestionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CourseManualScoresTest extends TestCase
{
    use RefreshDatabase;

    private string $course;

    protected function setUp(): void
    {
        parent::setUp();
        $this->course = (string) str()->uuid();
        DB::table('courses')->insert(['id' => $this->course, 'title' => 'دورة الدرجات', 'entity_type' => 'course']);
    }

    public function test_unauthenticated_writes_are_rejected(): void
    {
        $student = $this->student('male', 'طالب');
        $this->save([$this->grade($student, 8)])->assertUnauthorized();
        $this->assertDatabaseCount('course_manual_scores', 0);
    }

    public function test_pre_and_post_scores_without_answers_include_zero_and_do_not_create_submissions(): void
    {
        $this->acting('admin');
        $first = $this->student('male', 'الأول');
        $second = $this->student('male', 'الثاني');
        $this->save([$this->grade($first, 0), $this->grade($second, 12.5)])->assertOk()->assertJsonPath('saved', 2);
        $this->save([$this->grade($first, 10)], 'post')->assertOk();
        $this->assertDatabaseCount('course_submissions', 0);
        $this->assertDatabaseCount('course_submission_answers', 0);
        $this->assertDatabaseCount('course_score_history', 3);
        $pre = $this->results()->assertOk()->assertJsonCount(2, 'submissions')
            ->assertJsonPath('gradeSettings.totalPoints', 15)->assertJsonPath('gradeSettings.totalLocked', true);
        $scores = collect($pre->json('submissions'))->keyBy('loginId');
        $this->assertEquals(0, $scores[$first->login_code]['manualScore']);
        $this->assertEquals(12.5, $scores[$second->login_code]['manualScore']);
        $this->assertTrue($scores[$first->login_code]['scoreOnly']);
        $this->assertSame([], $scores[$first->login_code]['answers']);
        $this->assertEquals(10, $this->results('post')->json('submissions.0.manualScore'));
        app(CourseQuestionService::class)->create($this->course, 'pre', [
            'type' => 'multiple', 'prompt' => 'سؤال جديد', 'points' => 3, 'correctAnswer' => 'نعم',
        ]);
        $this->assertDatabaseCount('course_questions', 1);
        $this->results()->assertOk()->assertJsonPath('gradeSettings.totalPoints', 15);
    }

    public function test_edits_and_clear_preserve_answers_and_can_be_retried_without_duplicate_scores(): void
    {
        $this->acting('admin');
        $student = $this->student('male', 'طالب بإجابات');
        $question = (string) str()->uuid();
        $submission = (string) str()->uuid();
        DB::table('course_questions')->insert(['id' => $question, 'course_id' => $this->course,
            'assessment_type' => 'pre', 'question_type' => 'multiple', 'prompt' => 'سؤال',
            'points' => 15, 'correct_answer' => 'نعم']);
        DB::table('course_submissions')->insert(['id' => $submission, 'course_id' => $this->course,
            'assessment_type' => 'pre', 'student_id' => $student->id, 'student_name' => $student->full_name,
            'login_code' => $student->login_code, 'submitted_at' => now()]);
        DB::table('course_submission_answers')->insert(['id' => (string) str()->uuid(),
            'submission_id' => $submission, 'question_id' => $question, 'answer_text' => 'نعم']);
        $before = DB::table('course_submissions')->first();
        $this->save([$this->grade($student, 9)])->assertOk();
        $entry = $this->entry($student);
        $this->save([$this->grade($student, 9, $entry->version)])->assertOk()->assertJsonPath('saved', 0);
        $this->save([$this->grade($student, 11, $entry->version)])->assertOk();
        $this->results()->assertOk()->assertJsonPath('submissions.0.id', $submission)
            ->assertJsonPath('submissions.0.manualScore', 11)->assertJsonPath('submissions.0.scoreOnly', false)
            ->assertJsonPath('submissions.0.answers.0.value', 'نعم');
        $this->save([$this->grade($student, null, $this->entry($student)->version)])->assertOk();
        $this->results()->assertOk()->assertJsonPath('submissions.0.manualScore', null)
            ->assertJsonPath('submissions.0.answers.0.awardedPoints', 15);
        $this->assertEquals($before, DB::table('course_submissions')->first());
        $this->assertDatabaseCount('course_submission_answers', 1);
        $this->assertDatabaseCount('course_manual_scores', 1);
        $this->assertDatabaseCount('course_score_history', 3);
    }

    public function test_invalid_grade_or_stale_version_rolls_back_the_entire_batch(): void
    {
        $this->acting('admin');
        $first = $this->student('male', 'الأول');
        $second = $this->student('male', 'الثاني');
        $invalid = $this->save([$this->grade($first, 5), $this->grade($second, 16)])->assertUnprocessable();
        $this->assertSame('يجب أن تساوي درجة الاختبار درجة الطالب أو تزيد عليها.', $invalid->json('errors')['grades.1.score'][0]);
        $this->assertDatabaseCount('course_manual_scores', 0);
        $this->assertDatabaseCount('course_score_settings', 0);
        $this->save([$this->grade($first, 5)])->assertOk();
        $oldVersion = $this->entry($first)->version;
        $this->save([$this->grade($first, 7, $oldVersion)])->assertOk();
        $this->save([$this->grade($second, 8), $this->grade($first, 9, $oldVersion)])->assertStatus(409);
        $this->assertDatabaseCount('course_manual_scores', 1);
        $this->assertEquals(7, $this->entry($first)->score);
        $this->save([$this->grade($first, 10)])->assertStatus(409);
        $this->save([$this->grade($first, -1, $this->entry($first)->version)])->assertUnprocessable();
        $this->save([$this->grade($first, 1.234, $this->entry($first)->version)])->assertUnprocessable();
        $this->save([$this->grade($second, 5), $this->grade($second, 8)])->assertUnprocessable();
    }

    public function test_total_points_are_derived_from_questions_or_saved_for_a_questionless_scope(): void
    {
        $this->acting('admin');
        $student = $this->student('male', 'طالب');
        DB::table('course_questions')->insert(['id' => (string) str()->uuid(), 'course_id' => $this->course,
            'assessment_type' => 'pre', 'question_type' => 'text', 'prompt' => 'سؤال', 'points' => 10]);
        $this->save([$this->grade($student, 5)])->assertUnprocessable()->assertJsonValidationErrors('totalPoints');
        $this->save([$this->grade($student, 5)], 'pre', 'male', 10)->assertOk();
        $this->save([$this->grade($student, 5)], 'post', 'male', 0)->assertUnprocessable();
        $this->save([$this->grade($student, 5)], 'post', 'male', 20)->assertOk();
        $this->save([$this->grade($student, 6, $this->entry($student, 'post')->version)], 'post', 'male', 30)
            ->assertUnprocessable();
        $this->results('post')->assertJsonPath('gradeSettings.totalPoints', 20);
    }

    public function test_branch_permissions_unknown_students_and_unsupported_scopes_are_rejected(): void
    {
        $male = $this->student('male', 'معلم');
        $female = $this->student('female', 'معلمة');
        $this->acting('male_manager');
        $this->save([$this->grade($male, 10)])->assertOk();
        $this->save([$this->grade($female, 10)], 'pre', 'female')->assertForbidden();
        $this->save([$this->grade($female, 10)])->assertUnprocessable();
        $this->save([['studentId' => (string) str()->uuid(), 'score' => 10, 'expectedVersion' => null]])
            ->assertUnprocessable();
        $this->save([$this->grade($male, 10)], 'tasks')->assertUnprocessable();
        DB::table('role_permissions')->where('role', 'male_manager')->where('permission_key', 'page_results')
            ->update(['is_enabled' => false]);
        $this->save([$this->grade($male, 8, $this->entry($male)->version)])->assertOk();
        $this->assertEquals(8, $this->entry($male)->score);
        $this->acting('student');
        $this->save([$this->grade($male, 9)])->assertForbidden();
        $this->acting('female_manager');
        $this->save([$this->grade($female, 12)], 'post', 'female')->assertOk();
        $this->save([$this->grade($male, 10)], 'post', 'male')->assertForbidden();
        $this->assertDatabaseCount('course_manual_scores', 2);
    }

    public function test_public_snapshot_only_reveals_the_signed_in_students_score_and_clear_removes_score_only_result(): void
    {
        $this->acting('admin');
        $first = $this->student('male', 'الأول');
        $second = $this->student('male', 'الثاني');
        $this->save([$this->grade($first, 0), $this->grade($second, 13)])->assertOk();
        Sanctum::actingAs(User::factory()->create(['role' => 'student', 'login_code' => $first->login_code]));
        $this->getJson('/api/dashboard/snapshot')->assertOk()->assertJsonCount(1, 'submissions')
            ->assertJsonPath('submissions.0.manualScore', 0)->assertJsonPath('submissions.0.scoreTotal', 15);
        $this->getJson('/api/public/snapshot')->assertOk()->assertJsonCount(1, 'submissions');
        $this->acting('admin');
        $this->save([$this->grade($first, null, $this->entry($first)->version)])->assertOk();
        $this->results()->assertOk()->assertJsonCount(1, 'submissions')->assertJsonCount(2, 'scoreEntries');
        $this->save([$this->grade($first, 4, $this->entry($first)->version)])->assertOk();
        $this->assertDatabaseCount('course_manual_scores', 2);
    }

    public function test_archived_students_courses_and_tasks_cannot_receive_manual_scores(): void
    {
        $this->acting('admin');
        $student = $this->student('male', 'طالب');
        $archive = (string) str()->uuid();
        DB::table('archives')->insert(['id' => $archive, 'name' => 'أرشيف']);
        DB::table('students')->where('id', $student->id)->update(['archive_id' => $archive]);
        $this->save([$this->grade($student, 5)])->assertUnprocessable();
        DB::table('students')->where('id', $student->id)->update(['archive_id' => null]);
        DB::table('courses')->where('id', $this->course)->update(['archive_id' => $archive]);
        $this->save([$this->grade($student, 5)])->assertUnprocessable();
        DB::table('courses')->where('id', $this->course)->update(['archive_id' => null, 'entity_type' => 'task']);
        $this->save([$this->grade($student, 5)])->assertUnprocessable();
        $this->assertDatabaseCount('course_manual_scores', 0);
    }

    public function test_snapshot_pagination_keeps_real_answers_and_does_not_duplicate_them_as_score_only_results(): void
    {
        $this->acting('admin');
        $real = $this->student('male', 'طالب بإرسال');
        $grades = [];
        for ($i = 0; $i < 1001; $i++) {
            $student = $i === 0 ? $real : $this->student('male', 'طالب '.$i);
            $grades[] = $this->grade($student, 7);
        }
        $submissionId = (string) str()->uuid();
        DB::table('course_submissions')->insert(['id' => $submissionId, 'course_id' => $this->course,
            'assessment_type' => 'pre', 'student_id' => $real->id, 'student_name' => $real->full_name,
            'login_code' => $real->login_code, 'submitted_at' => now()]);
        $this->save($grades)->assertOk();
        // Force this real submission's grade onto the second grade page.
        DB::table('course_manual_scores')->where('student_id', $real->id)->update(['updated_at' => now()->subDay()]);
        $first = $this->getJson('/api/dashboard/snapshot')->assertOk();
        $this->assertEquals(7, collect($first->json('submissions'))->firstWhere('id', $submissionId)['manualScore']);
        $first->assertJsonPath('snapshotMeta.manualScores.nextPage', 2);
        $second = $this->getJson('/api/dashboard/snapshot?page=2')->assertOk()->assertJsonCount(0, 'submissions');
        $second->assertJsonPath('snapshotMeta.manualScores.nextPage', null);
        $this->assertSame(1001, count($first->json('submissions')));
    }

    private function acting(string $role): void
    {
        DB::table('role_permissions')->updateOrInsert(['role' => $role, 'permission_key' => 'page_results'], ['is_enabled' => true]);
        Sanctum::actingAs(User::factory()->create(['role' => $role]));
    }

    private function student(string $branch, string $name): Student
    {
        return Student::query()->create(['full_name' => $name, 'login_code' => (string) str()->uuid(),
            'branch_id' => DB::table('branches')->where('code', $branch)->value('id')]);
    }

    private function grade(Student $student, ?float $score, ?string $version = null): array
    {
        return ['studentId' => $student->id, 'score' => $score, 'expectedVersion' => $version];
    }

    private function save(array $grades, string $type = 'pre', string $branch = 'male', float $total = 15)
    {
        return $this->putJson('/api/dashboard/results/grades', ['courseId' => $this->course,
            'assessmentType' => $type, 'branchCode' => $branch, 'totalPoints' => $total, 'grades' => $grades]);
    }

    private function results(string $type = 'pre')
    {
        return $this->getJson('/api/dashboard/results?branchCode=male&assessmentType='.$type.'&courseId='.$this->course);
    }

    private function entry(Student $student, string $type = 'pre'): object
    {
        return DB::table('course_manual_scores')->join('course_score_settings', 'course_score_settings.id', '=', 'setting_id')
            ->where('student_id', $student->id)->where('assessment_type', $type)->select('course_manual_scores.*')->first();
    }
}
