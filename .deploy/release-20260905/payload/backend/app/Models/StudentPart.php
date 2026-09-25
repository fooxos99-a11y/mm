<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentPart extends Model
{
    use HasFactory, HasUuids;

    public $timestamps = false;

    protected $table = 'student_parts';

    public $incrementing = false;

    protected $primaryKey = null;

    protected $fillable = [
        'student_id',
        'part_number',
        'marked_by_reciter_id',
        'marked_at',
    ];

    protected function casts(): array
    {
        return [
            'marked_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function markedByReciter(): BelongsTo
    {
        return $this->belongsTo(Reciter::class, 'marked_by_reciter_id');
    }
}
