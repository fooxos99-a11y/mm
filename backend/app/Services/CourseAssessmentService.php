<?php

namespace App\Services;

use App\Services\Concerns\ImportsCourseAssessments;
use App\Services\Concerns\ManagesCourseAssessmentReviews;
use App\Services\Concerns\SubmitsCourseAssessments;

class CourseAssessmentService
{
    use ImportsCourseAssessments;
    use ManagesCourseAssessmentReviews;
    use SubmitsCourseAssessments;

    public function __construct(
        private readonly CourseAssessmentAvailabilityService $availabilityService,
        private readonly DashboardCommunicationService $dashboardCommunicationService,
        private readonly CourseAssessmentQuestionService $questionService,
        private readonly AssessmentAttachmentService $assessmentAttachmentService,
    ) {}
}
