<?php

namespace App\Services;

use App\Services\Concerns\AuthorizesFinalExamAccess;
use App\Services\Concerns\FinalExamNotifications;
use App\Services\Concerns\ManagesFinalExamQuestions;
use App\Services\Concerns\ManagesFinalExamSettings;
use App\Services\Concerns\ProcessesFinalExamSubmissions;

class FinalExamService
{
    use AuthorizesFinalExamAccess;
    use FinalExamNotifications;
    use ManagesFinalExamQuestions;
    use ManagesFinalExamSettings;
    use ProcessesFinalExamSubmissions;

    public function __construct(
        private readonly DashboardCommunicationService $dashboardCommunicationService,
        private readonly FinalExamSubmissionValidator $submissionValidator,
        private readonly AssessmentAttachmentService $assessmentAttachmentService,
    ) {}

}
