<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResultsDirectoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_attendance_totals_and_absence_filters_cover_all_pages(): void
    {
        $this->acting('admin');
        $course = $this->course();
        $this->course();
        $this->course();
        for ($i = 0; $i < 25; $i++) {
            $student = $this->student('male', sprintf('Teacher%02d', $i));
            if ($i < 21) {
                DB::table('course_attendance')->insert(['id' => (string) str()->uuid(), 'course_id' => $course,
                    'student_name' => $student->full_name, 'login_code' => $student->login_code]);
            }
        }
        $this->student('female', 'Hidden');
        $url = '/api/dashboard/results?branchCode=male&assessmentType=attendance&courseId='.$course;
        $this->getJson($url)->assertOk()->assertJsonCount(20, 'students')->assertJsonPath('pagination.total', 25)
            ->assertJsonPath('summary.present', 21)->assertJsonPath('summary.absent', 4);
        $this->getJson($url.'&page=2')->assertOk()->assertJsonCount(5, 'students')->assertJsonCount(1, 'attendance');
        $this->getJson($url.'&state=present&page=2')->assertOk()->assertJsonCount(1, 'students')->assertJsonPath('pagination.total', 21);
        $this->getJson($url.'&state=absent')->assertOk()->assertJsonCount(4, 'students');
        $this->getJson($url.'&state=absent3plus')->assertOk()->assertJsonCount(4, 'students')
            ->assertJsonPath('students.0.absenceCount', 3);
        $this->getJson($url.'&search=Teacher24')->assertOk()->assertJsonCount(1, 'students')->assertJsonPath('summary.present', 21);
    }

    public function test_assessments_include_unsubmitted_students_and_only_selected_course_records(): void
    {
        $this->acting('admin');
        $course = $this->course();
        $other = $this->course();
        $student = $this->student('male', 'A');
        $this->student('male', 'B');
        $question = (string) str()->uuid();
        DB::table('course_questions')->insert(['id' => $question, 'course_id' => $course, 'assessment_type' => 'pre',
            'question_type' => 'multiple', 'prompt' => 'Question', 'points' => 4, 'correct_answer' => 'A']);
        foreach ([$course, $other] as $id) {
            DB::table('course_submissions')->insert(['id' => (string) str()->uuid(), 'course_id' => $id,
                'assessment_type' => 'pre', 'student_name' => 'A', 'login_code' => $student->login_code, 'submitted_at' => now()]);
        }
        $submission = DB::table('course_submissions')->where('course_id', $course)->value('id');
        DB::table('course_submission_answers')->insert(['id' => (string) str()->uuid(), 'submission_id' => $submission,
            'question_id' => $question, 'answer_text' => 'A']);
        $response = $this->getJson('/api/dashboard/results?branchCode=male&assessmentType=pre&courseId='.$course)->assertOk()
            ->assertJsonCount(2, 'students')->assertJsonCount(1, 'submissions')->assertJsonCount(1, 'courses')
            ->assertJsonPath('submissions.0.answers.0.awardedPoints', 4);
        $legacy = $this->getJson('/api/dashboard/snapshot')->assertOk()->json('submissions');
        $this->assertSame(collect($legacy)->firstWhere('id', $submission), $response->json('submissions.0'));
        $this->getJson('/api/dashboard/results?branchCode=male&assessmentType=pre&courseId='.$course.'&search=B')
            ->assertOk()->assertJsonCount(1, 'students')->assertJsonCount(0, 'submissions');
    }

    public function test_scope_permissions_and_invalid_filters_are_enforced(): void
    {
        $this->acting('male_manager');
        $this->student('female', 'Hidden');
        $this->getJson('/api/dashboard/results?branchCode=male&assessmentType=final')->assertOk()->assertJsonCount(0, 'students');
        $this->getJson('/api/dashboard/results?branchCode=female&assessmentType=final')->assertForbidden();
        $this->getJson('/api/dashboard/results?branchCode=male&assessmentType=pre')->assertUnprocessable();
        $this->getJson('/api/dashboard/results?branchCode=male&assessmentType=final&perPage=101')->assertUnprocessable();
        DB::table('role_permissions')->where('role', 'male_manager')->where('permission_key', 'page_results')->update(['is_enabled' => false]);
        $this->getJson('/api/dashboard/results/catalog')->assertForbidden();
        $this->getJson('/api/dashboard/results?branchCode=male&assessmentType=final')->assertForbidden();
        $this->acting('student');
        $this->getJson('/api/dashboard/results/catalog')->assertForbidden();
    }

    private function acting(string $role): void
    {
        DB::table('role_permissions')->updateOrInsert(['role' => $role, 'permission_key' => 'page_results'], ['is_enabled' => true]);
        Sanctum::actingAs(User::factory()->create(['role' => $role]));
    }

    private function course(): string
    {
        $id = (string) str()->uuid();
        DB::table('courses')->insert(['id' => $id, 'title' => 'Course', 'entity_type' => 'course']);

        return $id;
    }

    private function student(string $branch, string $name): Student
    {
        return Student::query()->create(['full_name' => $name, 'login_code' => $name,
            'branch_id' => DB::table('branches')->where('code', $branch)->value('id')]);
    }
}
