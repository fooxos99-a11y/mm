<?php

namespace App\Models;

use App\Models\Concerns\BelongsToDepartment;

class Media extends \Spatie\MediaLibrary\MediaCollections\Models\Media
{
    use BelongsToDepartment;
}
