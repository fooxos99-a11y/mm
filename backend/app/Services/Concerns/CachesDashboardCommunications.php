<?php

namespace App\Services\Concerns;

use Illuminate\Support\Facades\Cache;

trait CachesDashboardCommunications
{
    public function clearCaches(): void
    {
        foreach (['admin', 'male', 'female'] as $scope) {
            $this->forget(self::NOTIFICATIONS_CACHE_KEY.':'.$scope);
        }
    }

    private function remember(string $key, \DateTimeInterface|\DateInterval|int $ttl, callable $resolver): mixed
    {
        try {
            return Cache::store('redis')->remember($key, $ttl, $resolver);
        } catch (\Throwable) {
            return Cache::remember($key, $ttl, $resolver);
        }
    }

    private function forget(string $key): void
    {
        try {
            Cache::store('redis')->forget($key);
        } catch (\Throwable) {
            Cache::forget($key);
        }
    }
}
