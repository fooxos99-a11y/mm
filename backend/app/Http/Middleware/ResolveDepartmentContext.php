<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\DepartmentContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

final class ResolveDepartmentContext
{
    public function handle(Request $request, Closure $next): Response
    {
        DepartmentContext::reset();
        try {
            $user = $request->user('sanctum') ?: $request->user();
            $management = $request->is('api/management/*', '*/api/management/*');
            $identity = $request->is('api/auth/*', '*/api/auth/*');
            if ($request->is('api/public/registration', '*/api/public/registration',
                'api/public/registration-requests', '*/api/public/registration-requests')) {
                $id = $request->input('departmentId') ?? DepartmentContext::DEFAULT_ID;
                abort_unless(is_string($id) && $id !== '', 404, 'رابط التسجيل غير متاح.');
                DepartmentContext::set($id);
                $this->assertActive($id);

                return $next($request);
            }
            if ($request->is('api/public/departments', '*/api/public/departments')) {
                DepartmentContext::set(null);

                return $next($request);
            }
            if ($user instanceof User) {
                abort_unless($user->is_active, 403, 'هذا الحساب موقوف.');
                if ($user->role === 'super_admin') {
                    if ($management) {
                        DepartmentContext::set(null);

                        return $next($request);
                    }
                    $id = $request->header('X-Department-Id') ?: $request->input('departmentId')
                        ?: ($request->hasSession() ? $request->session()->get('management_department_id') : null);
                    if ($identity && $id && ! DB::table('departments')->where('id', $id)->where('is_active', true)->exists()) {
                        $id = null;
                    } elseif ($id) {
                        $this->assertActive((string) $id);
                    }
                    DepartmentContext::set($id ? (string) $id : null);
                    abort_if(! $id && ! $management && ! $identity, 403, 'اختر الإدارة أولًا.');
                } else {
                    $id = $user->department_id;
                    $requested = $request->header('X-Department-Id') ?: $request->input('departmentId');
                    abort_if($requested && $requested !== $id, 403, 'هذه الإدارة غير متاحة لحسابك.');
                    DepartmentContext::set($id);
                    if (! $identity) {
                        abort_unless($id, 403, 'حسابك بانتظار ربطه بإدارة.');
                        $this->assertActive($id);
                    }
                }
            } else {
                $id = $request->input('departmentId') ?: DepartmentContext::DEFAULT_ID;
                DepartmentContext::set((string) $id);
                // Public content can use the original department without exposing private data.
                if (! $identity && ! $request->is('api/health/*', '*/api/health/*')) {
                    $this->assertActive((string) $id);
                }
            }

            return $next($request);
        } finally {
            DepartmentContext::reset();
        }
    }

    private function assertActive(string $id): void
    {
        abort_unless(DB::table('departments')->where('id', $id)->where('is_active', true)->exists(), 404,
            'الإدارة غير متاحة.');
    }
}
