<?php

namespace App\Services;

use App\Services\Concerns\CourseManagementSupport;
use App\Services\Concerns\CreatesAndUpdatesCourses;
use App\Services\Concerns\ManagesCourseLifecycle;
use App\Services\Concerns\ManagesCourseQuestions;

class CourseManagementService
{
    use CourseManagementSupport;
    use CreatesAndUpdatesCourses;
    use ManagesCourseLifecycle;
    use ManagesCourseQuestions;

    public function __construct(
        private readonly CourseQuestionService $courseQuestionService,
        private readonly DashboardCommunicationService $dashboardCommunicationService,
        private readonly AssessmentAttachmentService $assessmentAttachmentService,
    ) {
    }
}
