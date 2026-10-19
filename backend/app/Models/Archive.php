<?php

namespace App\Models;

use App\Models\Concerns\BelongsToDepartment;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Archive extends Model
{
    use BelongsToDepartment;
    use HasUuids;

    public const COUNT_FIELDS = [
        'courses_count', 'tasks_count', 'male_teachers_count', 'female_teachers_count', 'completed_parts_count',
    ];

    protected $fillable = ['name', 'batch_type', ...self::COUNT_FIELDS];

    protected $casts = [
        'courses_count' => 'integer',
        'tasks_count' => 'integer',
        'male_teachers_count' => 'integer',
        'female_teachers_count' => 'integer',
        'completed_parts_count' => 'integer',
    ];

    public $timestamps = false;
}
