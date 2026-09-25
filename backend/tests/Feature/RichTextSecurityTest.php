<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RichTextSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_rich_text_is_sanitized_before_it_is_persisted(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $courseId = $this->postJson('/api/dashboard/courses', [
            'title' => 'مهمة آمنة',
            'entityType' => 'task',
            'taskMode' => 'document',
            'taskTemplateName' => 'قالب',
            'taskTemplateContent' => '<p onclick="alert(1)">النص<script>alert(2)</script></p>',
            'taskDescription' => '<a href="javascript:alert(3)">الوصف</a>',
        ])->assertCreated()->json('id');

        $course = DB::table('courses')->where('id', $courseId)->first();

        $this->assertNotNull($course);
        $this->assertSame('<p>النص</p>', $course->task_template_content);
        $this->assertSame('<a>الوصف</a>', $course->task_description);
    }

    public function test_question_prompts_are_sanitized_without_removing_safe_formatting(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $courseId = $this->postJson('/api/dashboard/courses', ['title' => 'دورة'])->assertCreated()->json('id');

        $questionId = $this->postJson('/api/dashboard/courses/'.$courseId.'/questions', [
            'assessmentType' => 'pre',
            'prompt' => '<strong>سؤال</strong><img src=x onerror="alert(1)">',
            'type' => 'truefalse',
            'options' => [],
            'allowFile' => false,
            'points' => 1,
            'correctAnswer' => 'صح',
        ])->assertCreated()->json('id');

        $prompt = DB::table('course_questions')->where('id', $questionId)->value('prompt');

        $this->assertSame('<strong>سؤال</strong><img>', $prompt);
    }
}
