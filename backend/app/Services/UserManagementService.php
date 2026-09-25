<?php

namespace App\Services;

use App\Services\Concerns\ManagesReciterAccounts;
use App\Services\Concerns\ManagesStudents;
use App\Services\Concerns\ResolvesUserManagementBranches;

class UserManagementService
{
    use ManagesReciterAccounts;
    use ManagesStudents;
    use ResolvesUserManagementBranches;
}
