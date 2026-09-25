<?php

namespace App\Services;

use App\Services\Concerns\AuthorizesTrainingMaterials;
use App\Services\Concerns\ManagesTrainingMaterials;
use App\Services\Concerns\SerializesTrainingMaterials;
use App\Services\Concerns\SyncsTrainingMaterialAttachments;

class TrainingMaterialService
{
    use AuthorizesTrainingMaterials;
    use ManagesTrainingMaterials;
    use SerializesTrainingMaterials;
    use SyncsTrainingMaterialAttachments;

    public function __construct(private readonly DashboardCommunicationService $dashboardCommunicationService) {}
}
