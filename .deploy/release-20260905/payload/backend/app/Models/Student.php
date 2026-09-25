<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Student extends Model
{
    use HasFactory, HasUuids;

    public $timestamps = false;

    protected $table = 'students';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'full_name',
        'login_code',
        'archived_login_code',
        'branch_id',
        'note',
        'is_certified',
        'created_by',
        'created_at',
        'archive_id',
    ];

    protected function casts(): array
    {
        return [
            'is_certified' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function reciters(): BelongsToMany
    {
        return $this->belongsToMany(Reciter::class, 'reciter_students')->withPivot('created_at');
    }

    public function parts(): HasMany
    {
        return $this->hasMany(StudentPart::class);
    }

    public function registrationRequest(): HasOne
    {
        return $this->hasOne(RegistrationRequest::class)->latestOfMany();
    }
}
