<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SnapshotCompletenessTest extends TestCase
{
    use RefreshDatabase;

    public function test_students_and_course_questions_after_one_thousand_remain_visible_and_branch_scoped(): void
    {
        $branch = DB::table('branches')->where('code', 'male')->value('id');
        $courseId = (string) str()->uuid();
        DB::table('courses')->insert(['id' => $courseId, 'title' => 'Complete questions', 'created_at' => now()]);
        collect(range(1, 1001))->chunk(100)->each(function ($indexes) use ($branch, $courseId): void {
            DB::table('students')->insert($indexes->map(fn ($index) => [
                'id' => (string) str()->uuid(), 'full_name' => 'Student '.$index,
                'login_code' => 'complete-'.$index, 'branch_id' => $branch, 'created_at' => now(),
            ])->all());
            DB::table('course_questions')->insert($indexes->map(fn ($index) => [
                'id' => (string) str()->uuid(), 'course_id' => $courseId, 'assessment_type' => 'pre',
                'question_type' => 'multiple', 'prompt' => 'Question '.$index, 'options' => '["A","B"]',
                'correct_answer' => 'A', 'points' => 1, 'sort_order' => $index, 'created_at' => now(),
            ])->all());
        });
        $femaleId = (string) str()->uuid();
        DB::table('students')->insert([
            'id' => $femaleId, 'full_name' => 'Other branch', 'login_code' => 'other-branch',
            'branch_id' => DB::table('branches')->where('code', 'female')->value('id'), 'created_at' => now(),
        ]);
        Sanctum::actingAs(User::factory()->create(['role' => 'male_manager']));
        $this->getJson('/api/dashboard/snapshot')->assertOk()
            ->assertJsonCount(1001, 'students')->assertJsonCount(1001, 'courses.0.preQuestions')
            ->assertJsonMissing(['id' => $femaleId])->assertJsonPath('courses.0.preQuestions.1000.correctAnswer', '');
    }
}
