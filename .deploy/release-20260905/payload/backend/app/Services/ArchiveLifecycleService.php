<?php

namespace App\Services;

use App\Services\Concerns\ArchivesActiveBatch;
use App\Services\Concerns\DeletesArchives;

final class ArchiveLifecycleService
{
    use ArchivesActiveBatch;
    use DeletesArchives;
}
