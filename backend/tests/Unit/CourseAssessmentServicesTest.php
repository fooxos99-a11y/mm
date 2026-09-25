<?php

namespace Tests\Unit;

use App\Services\CourseAssessmentAvailabilityService;
use App\Services\CourseAssessmentQuestionService;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class CourseAssessmentServicesTest extends TestCase
{
    public function test_question_service_rejects_duplicate_answers_before_persistence(): void
    {
        $this->expectException(ValidationException::class);

        app(CourseAssessmentQuestionService::class)->snapshots('course-id', 'pre', [[
            'answers' => [
                ['questionId' => 'question-id'],
                ['questionId' => 'question-id'],
            ],
        ]]);
    }

    public function test_availability_service_accepts_an_active_global_window(): void
    {
        $course = (object) [
            'is_pre_enabled' => true,
            'assessment_windows' => json_encode([
                'global' => ['pre' => ['closesAt' => now()->addMinute()->toISOString()]],
                'male' => [],
                'female' => [],
            ]),
        ];

        app(CourseAssessmentAvailabilityService::class)->assertOpen($course, 'pre', null);

        $this->addToAssertionCount(1);
    }

    public function test_availability_service_rejects_an_expired_global_window(): void
    {
        $course = (object) [
            'is_pre_enabled' => true,
            'assessment_windows' => json_encode([
                'global' => ['pre' => ['closesAt' => now()->subMinute()->toISOString()]],
                'male' => [],
                'female' => [],
            ]),
        ];

        $this->expectException(ValidationException::class);
        app(CourseAssessmentAvailabilityService::class)->assertOpen($course, 'pre', null);
    }
}
