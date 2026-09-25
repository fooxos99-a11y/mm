<?php

namespace Tests\Feature;

use App\Services\OperationalMetricsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class OperationalHealthTest extends TestCase
{
    use RefreshDatabase;

    public function test_operational_health_reports_database_cache_queue_errors_and_latency(): void
    {
        $this->getJson('/api/health/operations')
            ->assertOk()
            ->assertJsonPath('status', 'healthy')
            ->assertJsonPath('checks.database', true)
            ->assertJsonPath('checks.cache', true)
            ->assertJsonPath('metrics.queue.pending', 0)
            ->assertJsonPath('metrics.queue.failed', 0)
            ->assertJsonStructure(['metrics' => [
                'latencyMs',
                'errorsLastFiveMinutes',
                'lastErrorAt',
                'clientErrorsLastFiveMinutes',
                'lastClientErrorAt',
            ]]);
    }

    public function test_recent_exception_threshold_degrades_operational_health(): void
    {
        config()->set('operations.max_recent_errors', 0);
        app(OperationalMetricsService::class)->recordException(new RuntimeException('synthetic monitor test'));

        $this->getJson('/api/health/operations')
            ->assertStatus(503)
            ->assertJsonPath('status', 'degraded')
            ->assertJsonPath('metrics.errorsLastFiveMinutes', 1);
    }

    public function test_recent_client_error_threshold_degrades_operational_health(): void
    {
        config()->set('operations.max_recent_client_errors', 0);
        app(OperationalMetricsService::class)->recordClientError();

        $this->getJson('/api/health/operations')
            ->assertStatus(503)
            ->assertJsonPath('status', 'degraded')
            ->assertJsonPath('metrics.clientErrorsLastFiveMinutes', 1);
    }
}
