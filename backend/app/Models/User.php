<?php

namespace App\Models;

use App\Support\DepartmentContext;
use App\Support\DepartmentData;
// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $attributes = ['is_active' => true];

    protected static function booted(): void
    {
        static::creating(function (User $user): void {
            if (Schema::hasColumn('users', 'department_id') && ! array_key_exists('department_id', $user->getAttributes())) {
                $user->department_id = DepartmentContext::id();
            }
            DepartmentData::reserveLoginCode((string) $user->login_code, (string) $user->getKey(), $user->department_id);
        });

        static::updating(function (User $user): void {
            if ($user->isDirty('login_code')) {
                DepartmentData::reserveLoginCode((string) $user->login_code, (string) $user->getKey(), $user->department_id);
            }
        });

        static::updated(function (User $user): void {
            if ($user->wasChanged('department_id') && $user->department_id !== null
                && Schema::hasColumn('reserved_login_codes', 'department_id')) {
                // An initially unassigned account acquires its origin once; history never moves.
                DB::table('reserved_login_codes')->where('user_id', $user->getKey())->whereNull('department_id')
                    ->update(['department_id' => $user->department_id]);
            }
            if ($user->wasChanged(['login_code', 'password', 'department_id', 'is_active', 'role'])) {
                $user->invalidateAuthentication();
            }
        });

        static::deleting(function (User $user): void {
            $user->invalidateAuthentication();
        });
    }

    public function invalidateAuthentication(): void
    {
        if (Schema::hasTable('sessions')) {
            DB::table('sessions')->where('user_id', $this->getKey())->delete();
        }

        if (Schema::hasTable('personal_access_tokens')) {
            DB::table('personal_access_tokens')
                ->where('tokenable_type', self::class)
                ->where('tokenable_id', $this->getKey())
                ->delete();
        }
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'department_id',
        'is_active',
        'full_name',
        'role',
        'login_code',
        'email',
        'password',
        'must_change_password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'must_change_password' => 'boolean',
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }
}
