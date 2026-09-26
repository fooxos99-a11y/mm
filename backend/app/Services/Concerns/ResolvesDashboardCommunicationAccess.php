<?php

namespace App\Services\Concerns;

use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

trait ResolvesDashboardCommunicationAccess
{
    private function decodeArray(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        $decoded = json_decode((string) $value, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function currentUser(): ?User
    {
        $user = auth('sanctum')->user() ?: auth()->user();

        return $user instanceof User ? $user : null;
    }

    private function actorIdentity(?User $user): array
    {
        $role = (string) ($user?->role ?? '');

        if ($user && in_array($role, ['admin', 'male_manager', 'female_manager'], true)) {
            $name = trim((string) $user->full_name) ?: trim((string) $user->login_code);

            return [$name, $role];
        }

        return ['system', 'system'];
    }

    private function currentActorRole(): string
    {
        return (string) ($this->currentUser()?->role ?? '');
    }

    private function managedBranchCode(): ?string
    {
        return match ($this->currentActorRole()) {
            'male_manager' => 'male',
            'female_manager' => 'female',
            default => null,
        };
    }

    private function normalizeLoginIds(mixed $loginIds): array
    {
        return collect(is_array($loginIds) ? $loginIds : [])
            ->map(fn ($loginId): string => trim((string) $loginId))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function allowedLoginCodesForBranch(string $branchCode): Collection
    {
        $studentLoginCodes = DB::table('students')
            ->join('branches', 'branches.id', '=', 'students.branch_id')
            ->where('branches.code', $branchCode)
            ->whereNull('students.archive_id')
            ->pluck('students.login_code');
        $reciterLoginCodes = DB::table('reciters')
            ->join('branches', 'branches.id', '=', 'reciters.branch_id')
            ->join('users', 'users.id', '=', 'reciters.user_id')
            ->where('branches.code', $branchCode)
            ->whereNull('reciters.archive_id')
            ->pluck('users.login_code');

        return $studentLoginCodes
            ->merge($reciterLoginCodes)
            ->map(fn ($loginCode): string => trim((string) $loginCode))
            ->filter()
            ->unique()
            ->flip();
    }

    private function assertLoginIdsBelongToBranch(array $loginIds, string $branchCode): void
    {
        $allowedLoginCodes = $this->allowedLoginCodesForBranch($branchCode);

        if (! collect($loginIds)->every(fn (string $loginId): bool => $allowedLoginCodes->has($loginId))) {
            throw new AuthorizationException;
        }
    }

    private function studentBranchCode(string $loginCode): ?string
    {
        $branchCode = DB::table('students')
            ->join('branches', 'branches.id', '=', 'students.branch_id')
            ->whereNull('students.archive_id')
            ->where('students.login_code', trim($loginCode))
            ->value('branches.code');

        return in_array($branchCode, ['male', 'female'], true) ? (string) $branchCode : null;
    }

    private function notificationIsVisibleToBranch(
        array $notification,
        string $branchCode,
        Collection $allowedLoginCodes
    ): bool {
        $targetBranchCode = trim((string) ($notification['targetBranchId'] ?? ''));

        if ($targetBranchCode !== '' && $targetBranchCode !== $branchCode) {
            return false;
        }

        $targetLoginIds = $this->normalizeLoginIds($notification['targetLoginIds'] ?? []);

        return collect($targetLoginIds)
            ->every(fn (string $loginId): bool => $allowedLoginCodes->has($loginId));
    }

    private function assertCanManageNotification(object $notification): void
    {
        if ($this->currentActorRole() === 'admin') {
            return;
        }

        $managedBranch = $this->managedBranchCode();
        $targetBranchCode = trim((string) ($notification->target_branch_code ?? ''));
        $targetLoginIds = $this->normalizeLoginIds($this->decodeArray($notification->target_login_ids ?? null));

        if (
            $managedBranch === null
                || ($targetBranchCode !== $managedBranch && ($targetBranchCode !== '' || $targetLoginIds === []))
        ) {
            throw new AuthorizationException;
        }

        $this->assertLoginIdsBelongToBranch($targetLoginIds, $managedBranch);
    }
}
