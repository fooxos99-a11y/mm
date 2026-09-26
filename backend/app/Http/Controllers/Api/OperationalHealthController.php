<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OperationalMetricsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class OperationalHealthController extends Controller
{
    public function __construct(private readonly OperationalMetricsService $metrics) {}

    public function __invoke(): JsonResponse
    {
        $startedAt = hrtime(true);
        $databaseHealthy = $this->databaseIsHealthy();
        $cacheHealthy = $this->cacheIsHealthy();
        $queue = $this->queueSnapshot();
        $errors = $this->metrics->snapshot();
        $healthy = $databaseHealthy
            && $cacheHealthy
            && $queue['pending'] <= config('operations.max_pending_jobs')
            && $queue['failed'] <= config('operations.max_failed_jobs')
            && $errors['errorsLastFiveMinutes'] <= config('operations.max_recent_errors')
            && $errors['clientErrorsLastFiveMinutes'] <= config('operations.max_recent_client_errors');

        return response()->json([
            'status' => $healthy ? 'healthy' : 'degraded',
            'checks' => [
                'database' => $databaseHealthy,
                'cache' => $cacheHealthy,
            ],
            'metrics' => [
                'latencyMs' => round((hrtime(true) - $startedAt) / 1_000_000, 2),
                ...$errors,
                'queue' => $queue,
            ],
            'checkedAt' => now()->toISOString(),
        ], $healthy ? 200 : 503);
    }

    private function databaseIsHealthy(): bool
    {
        try {
            DB::select('select 1');

            return true;
        } catch (Throwable) {
            return false;
        }
    }

    private function cacheIsHealthy(): bool
    {
        $key = 'operations:health:'.str()->uuid();

        try {
            Cache::put($key, 'ok', 10);

            return Cache::pull($key) === 'ok';
        } catch (Throwable) {
            return false;
        }
    }

    /** @return array{connection: string, pending: int, failed: int} */
    private function queueSnapshot(): array
    {
        try {
            return [
                'connection' => (string) config('queue.default'),
                'pending' => Schema::hasTable('jobs') ? DB::table('jobs')->count() : 0,
                'failed' => Schema::hasTable('failed_jobs') ? DB::table('failed_jobs')->count() : 0,
            ];
        } catch (Throwable) {
            return [
                'connection' => (string) config('queue.default'),
                'pending' => PHP_INT_MAX,
                'failed' => PHP_INT_MAX,
            ];
        }
    }
}
