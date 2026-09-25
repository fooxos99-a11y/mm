<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Throwable;

class OperationalMetricsService
{
    private const ERROR_BUCKET_PREFIX = 'operations:errors:';

    private const LAST_ERROR_KEY = 'operations:last-error-at';

    private const CLIENT_ERROR_BUCKET_PREFIX = 'operations:client-errors:';

    private const LAST_CLIENT_ERROR_KEY = 'operations:last-client-error-at';

    public function recordException(Throwable $exception): void
    {
        try {
            $key = self::ERROR_BUCKET_PREFIX.now()->format('YmdHi');
            Cache::add($key, 0, now()->addMinutes(10));
            Cache::increment($key);
            Cache::put(self::LAST_ERROR_KEY, now()->toISOString(), now()->addMinutes(10));
        } catch (Throwable) {
            // Monitoring must never hide or replace the original exception.
        }
    }

    public function recordClientError(): void
    {
        try {
            $key = self::CLIENT_ERROR_BUCKET_PREFIX.now()->format('YmdHi');
            Cache::add($key, 0, now()->addMinutes(10));
            Cache::increment($key);
            Cache::put(self::LAST_CLIENT_ERROR_KEY, now()->toISOString(), now()->addMinutes(10));
        } catch (Throwable) {
            // Client telemetry must not affect the user request.
        }
    }

    /** @return array{errorsLastFiveMinutes: int, lastErrorAt: ?string, clientErrorsLastFiveMinutes: int, lastClientErrorAt: ?string} */
    public function snapshot(): array
    {
        $errors = collect(range(0, 4))->sum(function (int $minutesAgo): int {
            $key = self::ERROR_BUCKET_PREFIX.now()->subMinutes($minutesAgo)->format('YmdHi');

            return (int) Cache::get($key, 0);
        });
        $clientErrors = collect(range(0, 4))->sum(function (int $minutesAgo): int {
            $key = self::CLIENT_ERROR_BUCKET_PREFIX.now()->subMinutes($minutesAgo)->format('YmdHi');

            return (int) Cache::get($key, 0);
        });

        return [
            'errorsLastFiveMinutes' => $errors,
            'lastErrorAt' => Cache::get(self::LAST_ERROR_KEY),
            'clientErrorsLastFiveMinutes' => $clientErrors,
            'lastClientErrorAt' => Cache::get(self::LAST_CLIENT_ERROR_KEY),
        ];
    }
}
