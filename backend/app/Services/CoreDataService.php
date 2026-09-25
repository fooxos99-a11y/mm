<?php

namespace App\Services;

use App\Services\Concerns\BuildsDashboardSnapshots;
use App\Services\Concerns\LoadsPublicDashboardStats;
use App\Services\Concerns\ManagesCoreDataPermissions;
use App\Services\Concerns\ManagesDashboardTemplatesAndCommunications;
use App\Services\Concerns\SerializesResultsPages;

class CoreDataService
{
    use BuildsDashboardSnapshots;
    use LoadsPublicDashboardStats;
    use ManagesCoreDataPermissions;
    use ManagesDashboardTemplatesAndCommunications;
    use SerializesResultsPages;

    public function __construct(
        private readonly StudentAccountService $studentAccountService,
        private readonly DashboardCommunicationService $dashboardCommunicationService,
        private readonly TrainingMaterialService $trainingMaterialService,
        private readonly PageContentService $pageContentService,
        private readonly RegistrationService $registrationService,
        private readonly DashboardSnapshotPeopleLoader $dashboardSnapshotPeopleLoader,
        private readonly DashboardSnapshotCourseLoader $dashboardSnapshotCourseLoader,
        private readonly DashboardSnapshotFeedbackLoader $dashboardSnapshotFeedbackLoader,
        private readonly DashboardSnapshotReferenceLoader $dashboardSnapshotReferenceLoader,
        private readonly AssessmentAttachmentService $assessmentAttachmentService,
    ) {}
}
