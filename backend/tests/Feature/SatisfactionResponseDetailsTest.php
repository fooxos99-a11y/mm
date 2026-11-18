<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Student;
use App\Models\User;
use App\Support\DepartmentContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SatisfactionResponseDetailsTest extends TestCase
{
    use RefreshDatabase;

    public function test_existing_answers_keep_the_question_prompt_after_question_deletion(): void
    {
        [$course, $question] = $this->survey();
        $id = $this->response($course, $question, 'old-login', 'اسم محفوظ سابقًا');
        $this->deleteJson('/api/dashboard/satisfaction-questions/'.$question)->assertNoContent();

        $snapshot = $this->getJson('/api/dashboard/snapshot')->assertOk();
        $snapshot->assertJsonCount(0, 'satisfactionQuestions')
            ->assertJsonPath('satisfactionResponses.0.id', $id)
            ->assertJsonPath('satisfactionResponses.0.studentName', 'اسم محفوظ سابقًا')
            ->assertJsonPath('satisfactionResponses.0.questionPrompt', 'تقييم الدورة المحفوظ')
            ->assertJsonPath('satisfactionResponses.0.ratingValue', 8)
            ->assertJsonPath('satisfactionResponses.0.textValue', "ملاحظة قديمة\nالسطر الثاني");
        $this->assertDatabaseHas('satisfaction_responses', ['id' => $id, 'submitted_at' => '2025-01-01 09:00:00']);
    }

    public function test_response_pages_keep_historical_metadata_and_accurate_counts(): void
    {
        [$course, $question] = $this->survey();
        $rows = [];
        for ($index = 0; $index < 1001; $index++) {
            $rows[] = $this->responseRow($course, $question, 'historical-'.$index, 'مشارك '.$index);
        }
        foreach (array_chunk($rows, 50) as $chunk) {
            DB::table('satisfaction_responses')->insert($chunk);
        }
        $this->getJson('/api/dashboard/snapshot?page=1')->assertOk()
            ->assertJsonCount(1000, 'satisfactionResponses')
            ->assertJsonPath('snapshotMeta.satisfactionResponses.total', 1001)
            ->assertJsonPath('snapshotMeta.satisfactionResponses.nextPage', 2);
        $this->getJson('/api/dashboard/snapshot?page=2')->assertOk()
            ->assertJsonCount(1, 'satisfactionResponses')
            ->assertJsonPath('satisfactionResponses.0.questionPrompt', 'تقييم الدورة المحفوظ')
            ->assertJsonPath('snapshotMeta.satisfactionResponses.nextPage', null);
    }

    public function test_people_and_question_metadata_are_isolated_by_department_branch_and_identity(): void
    {
        [$course, $question] = $this->survey();
        foreach (['male' => '6101', 'female' => '6102'] as $branch => $login) {
            Student::create([
                'full_name' => 'مشارك '.$branch, 'login_code' => $login,
                'branch_id' => DB::table('branches')->where('code', $branch)->value('id'), 'note' => '',
            ]);
            $this->response($course, $question, $login, 'مشارك '.$branch);
        }
        $foreign = Department::create(['name' => 'إدارة أخرى', 'is_active' => true]);
        $foreignCourse = (array) DB::table('courses')->where('id', $course)->first();
        $foreignCourse['id'] = (string) Str::uuid();
        $foreignCourse['department_id'] = $foreign->id;
        DB::table('courses')->insert($foreignCourse);
        $foreignQuestion = (array) DB::table('satisfaction_questions')->where('id', $question)->first();
        $foreignQuestion['id'] = (string) Str::uuid();
        $foreignQuestion['course_id'] = $foreignCourse['id'];
        $foreignQuestion['department_id'] = $foreign->id;
        $foreignQuestion['prompt'] = 'سؤال خاص بإدارة أخرى';
        DB::table('satisfaction_questions')->insert($foreignQuestion);
        DB::table('satisfaction_responses')->insert([
            ...$this->responseRow($foreignCourse['id'], $foreignQuestion['id'], 'foreign', 'اسم خارج الإدارة'),
            'department_id' => $foreign->id,
        ]);
        // Even malformed legacy relations must not reveal another department's question.
        $this->response($course, $foreignQuestion['id'], 'broken-relation', 'علاقة قديمة');
        $admin = $this->getJson('/api/dashboard/snapshot')->assertOk();
        $this->assertCount(3, $admin->json('satisfactionResponses'));
        $this->assertSame('', collect($admin->json('satisfactionResponses'))->firstWhere('loginCode', 'broken-relation')['questionPrompt']);
        $content = json_encode($admin->json(), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $this->assertStringNotContainsString('اسم خارج الإدارة', $content);
        $this->assertStringNotContainsString('سؤال خاص بإدارة أخرى', $content);

        foreach (['male_manager' => '6101', 'female_manager' => '6102', 'student' => '6101'] as $role => $login) {
            Sanctum::actingAs(User::factory()->create(['role' => $role, 'login_code' => $role === 'student' ? $login : $role]));
            $response = $this->getJson('/api/dashboard/snapshot')->assertOk();
            $this->assertSame([$login], array_column($response->json('satisfactionResponses'), 'loginCode'));
            $response->assertJsonPath('satisfactionResponses.0.questionPrompt', 'تقييم الدورة المحفوظ');
        }

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/dashboard/snapshot')->assertUnauthorized();
        $this->getJson('/api/public/snapshot')->assertOk()->assertJsonCount(0, 'satisfactionResponses');
    }

    private function survey(): array
    {
        DepartmentContext::reset();
        Sanctum::actingAs(User::factory()->create(['role' => 'admin', 'login_code' => '9000']));
        $course = $this->postJson('/api/dashboard/courses', ['title' => 'دورة الردود السابقة', 'isActive' => false])
            ->assertCreated()->json('id');
        $question = $this->postJson('/api/dashboard/satisfaction-questions', [
            'courseId' => $course, 'targetScope' => 'course', 'prompt' => 'تقييم الدورة المحفوظ',
            'type' => 'rating', 'isRequired' => false,
        ])->assertCreated()->json('0.id');

        return [$course, $question];
    }

    private function response(string $course, string $question, string $login, string $name): string
    {
        $row = $this->responseRow($course, $question, $login, $name);
        DB::table('satisfaction_responses')->insert($row);

        return $row['id'];
    }

    private function responseRow(string $course, string $question, string $login, string $name): array
    {
        return [
            'id' => (string) Str::uuid(), 'course_id' => $course, 'question_id' => $question,
            'login_code' => $login, 'student_name' => $name, 'rating_value' => 8,
            'text_value' => "ملاحظة قديمة\nالسطر الثاني", 'submitted_at' => '2025-01-01 09:00:00',
            'department_id' => DepartmentContext::DEFAULT_ID,
        ];
    }
}
