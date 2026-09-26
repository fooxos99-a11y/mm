<?php

namespace App\Services;

use App\Services\Concerns\LoadsRegistrationData;
use App\Services\Concerns\ProcessesRegistrationRequests;
use App\Services\Concerns\SupportsRegistrationRequests;

class RegistrationService
{
    use LoadsRegistrationData;
    use ProcessesRegistrationRequests;
    use SupportsRegistrationRequests;

    public function __construct(
        private readonly RegistrationFormService $registrationFormService,
        private readonly RegistrationMetadataService $registrationMetadataService,
        private readonly StudentAccountService $studentAccountService,
    ) {
    }
}
