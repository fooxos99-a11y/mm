<?php

namespace App\Support;

use Closure;

/** The department is resolved by trusted middleware, never by a submitted record. */
final class DepartmentContext
{
    public const DEFAULT_ID = '00000000-0000-0000-0000-000000000001';

    private static ?string $departmentId = self::DEFAULT_ID;

    private static int $unscopedDepth = 0;

    public static function id(): ?string
    {
        return self::$departmentId;
    }

    public static function set(?string $departmentId): void
    {
        self::$departmentId = $departmentId;
    }

    public static function reset(): void
    {
        self::$departmentId = self::DEFAULT_ID;
        self::$unscopedDepth = 0;
    }

    public static function run(?string $departmentId, Closure $callback): mixed
    {
        $previous = self::$departmentId;
        self::$departmentId = $departmentId;

        try {
            return $callback();
        } finally {
            self::$departmentId = $previous;
        }
    }

    public static function withoutScope(Closure $callback): mixed
    {
        self::$unscopedDepth++;

        try {
            return $callback();
        } finally {
            self::$unscopedDepth--;
        }
    }

    public static function isUnscoped(): bool
    {
        return self::$unscopedDepth > 0;
    }

    public static function effectiveRole(?string $role): string
    {
        return $role === 'super_admin' && self::id() !== null && ! self::isUnscoped()
            ? 'admin'
            : (string) $role;
    }
}
