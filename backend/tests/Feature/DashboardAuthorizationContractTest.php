<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureDashboardAccess;
use App\Models\User;
use App\Support\Security\DashboardPermissionResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardAuthorizationContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_dashboard_management_route_declares_a_known_capability(): void
    {
        $resolver = app(DashboardPermissionResolver::class);
        $managementRoutes = collect(Route::getRoutes()->getRoutes())
            ->filter(fn ($route) => collect($route->gatherMiddleware())
                ->contains(fn (string $middleware): bool => str_starts_with($middleware, 'can:access-dashboard')));

        $this->assertNotEmpty($managementRoutes);

        foreach ($managementRoutes as $route) {
            // Bootstrap exposes only the actor's menu permissions and authorized aggregates.
            // It must remain available even when all page permissions are disabled.
            if ($route->uri() === 'api/dashboard/shell') {
                $this->assertSame(['GET', 'HEAD'], $route->methods());

                continue;
            }
            $permissionMiddleware = collect($route->gatherMiddleware())
                ->filter(fn (string $middleware): bool => str_starts_with($middleware, 'dashboard.access'))
                ->values();

            $this->assertCount(1, $permissionMiddleware, $route->uri());

            [, $capability] = array_pad(explode(':', $permissionMiddleware->first(), 2), 2, '');
            $request = Request::create('/'.$route->uri(), collect($route->methods())->first() ?: 'GET');

            $this->assertNotSame('', $capability, $route->uri());
            $this->assertNotNull($resolver->resolve($request, $capability), $route->uri());
        }
    }

    public function test_missing_or_unknown_capabilities_are_denied_even_to_admins(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        Route::middleware(['api', 'auth:sanctum', EnsureDashboardAccess::class])
            ->get('/api/test-dashboard-missing-capability', fn () => response()->json(['ok' => true]));
        Route::middleware(['api', 'auth:sanctum', EnsureDashboardAccess::class.':unknown-capability'])
            ->get('/api/test-dashboard-unknown-capability', fn () => response()->json(['ok' => true]));

        $this->getJson('/api/test-dashboard-missing-capability')->assertForbidden();
        $this->getJson('/api/test-dashboard-unknown-capability')->assertForbidden();
    }
}
