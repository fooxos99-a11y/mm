<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RegistrationRequest extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'full_name',
        'login_code',
        'initial_password',
        'phone',
        'gender',
        'answers',
        'student_id',
        'branch_code',
        'note',
        'status',
        'decision_reason',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $hidden = [
        'initial_password',
    ];

    protected function casts(): array
    {
        return [
            'answers' => 'array',
            'reviewed_at' => 'datetime',
        ];
    }
}
