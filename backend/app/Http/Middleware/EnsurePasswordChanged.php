<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->role === 'student' || ! $request->user()?->must_change_password) {
            return $next($request);
        }

        return new JsonResponse([
            'message' => 'يجب تغيير كلمة المرور قبل متابعة استخدام النظام.',
        ], Response::HTTP_LOCKED);
    }
}
