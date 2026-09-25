<?php

namespace Tests\Unit;

use App\Services\CourseQuestionService;
use App\Services\FinalExamSubmissionValidator;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AssessmentQuestionServicesTest extends TestCase
{
    public function test_course_question_service_rejects_an_invalid_assessment_type(): void
    {
        $this->expectException(ValidationException::class);

        app(CourseQuestionService::class)->create('course-id', 'invalid', []);
    }

    public function test_final_exam_validator_rejects_duplicate_answers_before_persistence(): void
    {
        $this->expectException(ValidationException::class);

        app(FinalExamSubmissionValidator::class)->questionSnapshots([
            ['questionId' => 'question-id'],
            ['questionId' => 'question-id'],
        ], 'male');
    }

    public function test_final_exam_validator_builds_submission_snapshots(): void
    {
        $columns = app(FinalExamSubmissionValidator::class)->snapshotColumns((object) [
            'prompt' => 'السؤال',
            'question_type' => 'multiple',
            'options' => '["أ","ب"]',
            'correct_answer' => 'أ',
            'points' => 2,
            'allow_file' => false,
        ]);

        $this->assertSame('السؤال', $columns['question_prompt_snapshot']);
        $this->assertSame('multiple', $columns['question_type_snapshot']);
        $this->assertSame('["أ","ب"]', $columns['question_options_snapshot']);
        $this->assertSame('أ', $columns['correct_answer_snapshot']);
        $this->assertSame(2, $columns['question_points_snapshot']);
        $this->assertFalse($columns['allow_file_snapshot']);
    }
}
