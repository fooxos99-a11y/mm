<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureGeneralManager
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()?->role === 'super_admin', 403, 'هذه الصفحة متاحة للمدير العام فقط.');

        return $next($request);
    }
}
