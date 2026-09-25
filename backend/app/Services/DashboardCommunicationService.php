<?php

namespace App\Services;

use App\Services\Concerns\CachesDashboardCommunications;
use App\Services\Concerns\ManagesDashboardNotifications;
use App\Services\Concerns\ResolvesDashboardCommunicationAccess;

class DashboardCommunicationService
{
    use CachesDashboardCommunications;
    use ManagesDashboardNotifications;
    use ResolvesDashboardCommunicationAccess;

    private const NOTIFICATIONS_CACHE_KEY = 'dashboard:notifications';
}
