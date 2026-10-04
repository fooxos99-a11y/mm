<?php

namespace App\Http\Middleware;

use App\Models\Reciter;
use App\Models\RegistrationRequest;
use App\Models\Student;
use App\Services\CoreDataService;
use App\Services\RegistrationService;
use App\Support\Security\DashboardPermissionResolver;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureDashboardAccess
{
    public function __construct(
        private readonly CoreDataService $coreDataService,
        private readonly DashboardPermissionResolver $permissionResolver,
        private readonly RegistrationService $registrationService,
    ) {
    }

    public function handle(Request $request, Closure $next, string $capability = ''): Response
    {
        $requirement = $this->permissionResolver->resolve($request, trim($capability));

        // Missing and unknown capabilities are always denied, including for admins.
        if ($requirement === null) {
            return $this->forbiddenResponse();
        }

        $user = $request->user();
        $role = (string) ($user?->role ?? '');

        if ($role === 'admin') {
            return $next($request);
        }

        if ($requirement['adminOnly'] || ! in_array($role, ['male_manager', 'female_manager'], true)) {
            return $this->forbiddenResponse();
        }

        $managedBranch = $role === 'female_manager' ? 'female' : 'male';
        if (! $this->requestTargetsOnlyManagedBranch($request, $managedBranch)) {
            return $this->forbiddenResponse();
        }

        $requiredPermissions = $requirement['permissions'];
        if ($requiredPermissions === []) {
            return $this->forbiddenResponse();
        }

        $permissions = $this->coreDataService->loadRolePermissions()[$role] ?? [];
        $checks = collect($requiredPermissions);
        $allowed = $requirement['requireAll']
            ? $checks->every(static fn (string $permission): bool => ($permissions[$permission] ?? false) === true)
            : $checks->contains(static fn (string $permission): bool => ($permissions[$permission] ?? false) === true);

        return $allowed ? $next($request) : $this->forbiddenResponse();
    }

    private function forbiddenResponse(): JsonResponse
    {
        return response()->json([
            'message' => 'غير مصرح لك بالوصول إلى لوحة التحكم.',
        ], Response::HTTP_FORBIDDEN);
    }

    private function requestTargetsOnlyManagedBranch(Request $request, string $managedBranch): bool
    {
        $otherBranch = $managedBranch === 'male' ? 'female' : 'male';

        foreach (['branchId', 'branchCode', 'targetBranchId'] as $branchKey) {
            $targetBranch = trim((string) $request->input($branchKey, ''));
            if (in_array($targetBranch, ['male', 'female'], true) && $targetBranch !== $managedBranch) {
                return false;
            }
        }

        $routeBranch = trim((string) $request->route('branchCode', ''));
        if (in_array($routeBranch, ['male', 'female'], true) && $routeBranch !== $managedBranch) {
            return false;
        }

        foreach (['branchAvailability', 'assessmentWindows'] as $branchScopedInput) {
            $branchPayload = $request->input($branchScopedInput);
            if (is_array($branchPayload) && array_key_exists($otherBranch, $branchPayload)) {
                return false;
            }
        }

        $student = $request->route('student');
        if ($student instanceof Student && $student->branch?->code !== $managedBranch) {
            return false;
        }

        $studentId = trim((string) $request->input('studentId', ''));
        if ($studentId !== '' && ! $this->modelBelongsToBranch(Student::class, $studentId, $managedBranch)) {
            return false;
        }

        $reciterId = trim((string) $request->input('targetReciterId', ''));
        if ($reciterId !== '' && ! $this->modelBelongsToBranch(Reciter::class, $reciterId, $managedBranch)) {
            return false;
        }

        $registrationRequestId = trim((string) $request->route('requestId', ''));
        if ($registrationRequestId !== '') {
            $registration = RegistrationRequest::query()
                ->whereKey($registrationRequestId)
                ->first(['id', 'branch_code', 'gender']);
            $targetBranch = $registration === null ? ''
                : $this->registrationService->resolveRegistrationRequestBranch($registration);

            if ($registration === null || $targetBranch !== $managedBranch) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  class-string<Student|Reciter>  $model
     */
    private function modelBelongsToBranch(string $model, string $id, string $managedBranch): bool
    {
        return $model::query()
            ->whereKey($id)
            ->whereHas('branch', fn ($query) => $query->where('code', $managedBranch))
            ->exists();
    }
}
