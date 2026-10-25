<?php

use App\Http\Middleware\AddSecurityHeaders;
use App\Http\Middleware\EnsureDashboardAccess;
use App\Http\Middleware\EnsureGeneralManager;
use App\Http\Middleware\EnsurePasswordChanged;
use App\Http\Middleware\ResolveDepartmentContext;
use App\Http\Middleware\SanitizeRichTextInput;
use App\Http\Middleware\StatefulAttachmentRequests;
use App\Services\OperationalMetricsService;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

$isApiRequest = static fn (Request $request): bool => $request->is('api/*')
    || $request->is('*/api/*')
    || str_contains($request->getRequestUri(), '/api/');

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withBroadcasting(
        __DIR__.'/../routes/channels.php',
        ['prefix' => 'api', 'middleware' => ['api', 'auth:sanctum']],
    )
    ->withMiddleware(function (Middleware $middleware) use ($isApiRequest): void {
        $middleware->trimStrings(except: ['currentPassword', 'passwordConfirmation', 'managerPassword']);
        $middleware->append(AddSecurityHeaders::class);
        $middleware->append(SanitizeRichTextInput::class);
        $middleware->statefulApi();
        $middleware->replaceInGroup('api',
            EnsureFrontendRequestsAreStateful::class,
            StatefulAttachmentRequests::class,
        );
        $middleware->api(append: [ResolveDepartmentContext::class]);
        $middleware->prependToPriorityList(
            SubstituteBindings::class,
            ResolveDepartmentContext::class,
        );
        $middleware->prependToPriorityList(EncryptCookies::class, StatefulAttachmentRequests::class);

        $middleware->redirectGuestsTo(function (Request $request) use ($isApiRequest): ?string {
            if ($isApiRequest($request)) {
                return null;
            }

            $basePath = trim($request->getBasePath(), '/');

            return $basePath === '' ? '/login' : "/{$basePath}/login";
        });

        $middleware->alias([
            'dashboard.access' => EnsureDashboardAccess::class,
            'password.changed' => EnsurePasswordChanged::class,
            'general.manager' => EnsureGeneralManager::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) use ($isApiRequest): void {
        $exceptions->render(function (PostTooLargeException $exception, Request $request) use ($isApiRequest) {
            if ($isApiRequest($request) || $request->expectsJson()) {
                return response()->json([
                    'message' => 'حجم المرفقات مجتمعة يتجاوز حد استقبال الطلب في الخادم. قلّل عدد الملفات أو أحجامها.',
                ], 413);
            }

            return null;
        });

        $exceptions->report(function (Throwable $exception): void {
            app(OperationalMetricsService::class)->recordException($exception);
        });

        $exceptions->render(function (AuthenticationException $exception, Request $request) use ($isApiRequest) {
            if ($isApiRequest($request) || $request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }

            return null;
        });
    })->create();
