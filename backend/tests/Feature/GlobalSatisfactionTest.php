<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\CourseManagementService;
use App\Services\SatisfactionTemplateService;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

class GlobalSatisfactionTest extends CoreDataApiTestCase
{
    private function course(string $title, string $type = 'course'): string
    {
        return app(CourseManagementService::class)->createCourse($title, false, ['entityType' => $type])['id'];
    }

    public function test_global_questions_cover_disabled_and_future_courses_without_duplicates(): void
    {
        $first = $this->course('مدخل القرآن');
        DB::table('courses')->where('id', $first)->update(['is_post_enabled' => false]);
        $task = $this->course('مهمة', 'task');
        $payload = ['prompt' => 'كيف كانت الدورة؟', 'type' => 'rating', 'isRequired' => true, 'targetScope' => 'all'];
        $this->postJson('/api/dashboard/satisfaction-questions', $payload)->assertCreated()->assertJsonCount(1);
        $id = DB::table('satisfaction_questions')->where('course_id', $first)->value('id');
        $this->postJson('/api/dashboard/satisfaction-questions', $payload)->assertCreated();
        $future = $this->course('دورة مستقبلية');
        app(SatisfactionTemplateService::class)->inherit($future);
        $this->assertSame(2, DB::table('satisfaction_questions')->count());
        $this->assertDatabaseHas('satisfaction_questions', ['id' => $id, 'course_id' => $first]);
        $this->assertDatabaseHas('satisfaction_questions', ['course_id' => $future, 'prompt' => $payload['prompt']]);
        $this->assertDatabaseMissing('satisfaction_questions', ['course_id' => $task]);
    }

    public function test_global_definition_is_saved_before_any_courses_exist_and_local_questions_stay_local(): void
    {
        $this->postJson('/api/dashboard/satisfaction-questions', [
            'prompt' => 'سؤال عام', 'type' => 'text', 'isRequired' => false, 'targetScope' => 'all',
        ])->assertCreated();
        $first = $this->course('أول دورة');
        DB::table('courses')->where('id', $first)->update(['is_post_enabled' => false]);
        $this->postJson('/api/dashboard/satisfaction-questions', [
            'prompt' => 'سؤال خاص', 'type' => 'text', 'isRequired' => true, 'targetScope' => 'course', 'courseId' => $first,
        ])->assertCreated();
        $future = $this->course('ثاني دورة');
        $this->assertDatabaseHas('satisfaction_questions', ['course_id' => $future, 'prompt' => 'سؤال عام']);
        $this->assertDatabaseMissing('satisfaction_questions', ['course_id' => $future, 'prompt' => 'سؤال خاص']);
        Sanctum::actingAs(User::factory()->create(['role' => 'student']));
        $this->postJson('/api/dashboard/satisfaction-questions', ['prompt' => 'غير مصرح'])->assertForbidden();
    }

    public function test_legacy_repair_keeps_question_ids_and_responses_and_does_not_generalize_local_questions(): void
    {
        $first = $this->course('أولى');
        $second = $this->course('ثانية');
        $missing = $this->course('مدخل القرآن');
        $createdAt = now()->subDay();
        $originalId = (string) str()->uuid();
        foreach ([$first, $second] as $index => $course) {
            DB::table('satisfaction_questions')->insert([
                'id' => $index === 0 ? $originalId : (string) str()->uuid(), 'course_id' => $course,
                'prompt' => 'سؤال عام قديم', 'type' => 'rating', 'is_required' => true, 'created_at' => $createdAt,
            ]);
        }
        DB::table('satisfaction_questions')->insert([
            'id' => (string) str()->uuid(), 'course_id' => $first,
            'prompt' => 'خاص بالدورة الأولى', 'type' => 'text', 'is_required' => false,
        ]);
        $responseId = (string) str()->uuid();
        DB::table('satisfaction_responses')->insert([
            'id' => $responseId, 'course_id' => $first, 'question_id' => $originalId,
            'login_code' => '1234', 'student_name' => 'تجريبي', 'rating_value' => 8, 'submitted_at' => now(),
        ]);
        $templates = app(SatisfactionTemplateService::class);
        $templates->restoreLegacyGlobals();
        $templates->restoreLegacyGlobals();
        $this->assertSame(4, DB::table('satisfaction_questions')->count());
        $this->assertDatabaseHas('satisfaction_questions', ['id' => $originalId, 'course_id' => $first]);
        $this->assertDatabaseHas('satisfaction_responses', ['id' => $responseId, 'question_id' => $originalId, 'rating_value' => 8]);
        $this->assertDatabaseHas('satisfaction_questions', ['course_id' => $missing, 'prompt' => 'سؤال عام قديم']);
        $this->assertDatabaseMissing('satisfaction_questions', ['course_id' => $missing, 'prompt' => 'خاص بالدورة الأولى']);
        $future = $this->course('مستقبلية');
        $this->assertDatabaseHas('satisfaction_questions', ['course_id' => $future, 'prompt' => 'سؤال عام قديم']);
    }
}
