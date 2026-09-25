<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Archive extends Model
{
    use HasUuids;

    protected $fillable = ['name', 'courses_count', 'batch_type'];

    protected $casts = [
        'courses_count' => 'integer',
    ];

    public $timestamps = false;
}
