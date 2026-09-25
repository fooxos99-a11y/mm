<?php

namespace App\Services;

use App\Models\Reciter;
use App\Models\Student;
use App\Models\User;
use Symfony\Component\HttpFoundation\Response;

class ReciterAccessService
{
    public function __construct(private readonly CoreDataService $coreDataService) {}

    public function assertCanViewAccount(?User $user, string $loginCode): void
    {
        $role = (string) ($user?->role ?? '');

        if (in_array($role, ['admin', 'male_manager', 'female_manager'], true)) {
            $this->assertCanManageBranch($user, $loginCode);

            return;
        }

        if ($role === 'reciter' && trim((string) $user?->login_code) === trim($loginCode)) {
            return;
        }

        abort(Response::HTTP_FORBIDDEN, 'غير مصرح لك بعرض بيانات هذا المقرئ.');
    }

    public function assertCanViewAssignedReciter(?User $user, string $loginCode): void
    {
        $role = (string) ($user?->role ?? '');
        $targetLoginCode = trim($loginCode);

        if (in_array($role, ['admin', 'male_manager', 'female_manager'], true)) {
            return;
        }

        if (in_array($role, ['student', 'trainee'], true) && trim((string) $user?->login_code) === $targetLoginCode) {
            return;
        }

        if ($role === 'reciter') {
            $reciter = Reciter::query()->where('user_id', $user?->getAuthIdentifier())->first();
            if ($reciter?->students()->where('students.login_code', $targetLoginCode)->exists()) {
                return;
            }
        }

        abort(Response::HTTP_FORBIDDEN, 'غير مصرح لك بعرض بيانات ربط هذا الطالب.');
    }

    public function assertCanToggleStudentPart(?User $user, Student $student, ?string $reciterId): void
    {
        $role = (string) ($user?->role ?? '');

        if ($role === 'admin') {
            return;
        }

        if (in_array($role, ['male_manager', 'female_manager'], true)) {
            $permissions = $this->coreDataService->loadRolePermissions()[$role] ?? [];
            $managedBranch = $role === 'female_manager' ? 'female' : 'male';

            if (($permissions['edit_student'] ?? false) === true && $student->branch?->code === $managedBranch) {
                return;
            }
        }

        if ($role === 'reciter') {
            $reciter = Reciter::query()->where('user_id', $user?->getAuthIdentifier())->first();
            $isSameReciter = $reciter && (! $reciterId || $reciter->id === $reciterId);
            $isLinkedStudent = $reciter?->students()->whereKey($student->getKey())->exists() ?? false;

            if ($isSameReciter && $isLinkedStudent) {
                return;
            }
        }

        abort(Response::HTTP_FORBIDDEN, 'غير مصرح لك بتعديل أجزاء هذا الطالب.');
    }

    public function assertCanManageBranch(?User $user, string $loginCode): void
    {
        $role = (string) ($user?->role ?? '');
        if ($role === 'admin') {
            return;
        }

        $managedBranch = match ($role) {
            'female_manager' => 'female',
            'male_manager' => 'male',
            default => '',
        };

        if ($managedBranch === '') {
            abort(Response::HTTP_FORBIDDEN, 'غير مصرح لك بإدارة هذا المقرئ.');
        }

        $reciterBranch = Reciter::query()
            ->whereHas('user', fn ($query) => $query->where('login_code', $loginCode))
            ->join('branches', 'branches.id', '=', 'reciters.branch_id')
            ->value('branches.code');

        if ($reciterBranch !== $managedBranch) {
            abort(Response::HTTP_FORBIDDEN, 'هذا المقرئ لا يتبع فرعك.');
        }
    }
}
