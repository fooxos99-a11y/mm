<?php

namespace App\Services\Concerns;

use App\Events\DashboardNotificationCreated;
use App\Events\DashboardNotificationDeleted;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

trait ManagesDashboardNotifications
{
    public function loadNotifications(bool $includeAll = false): array
    {
        $role = $this->currentActorRole();
        $managedBranch = $this->managedBranchCode();

        if ($role !== 'admin' && $managedBranch === null) {
            return [];
        }

        $cacheScope = $role === 'admin' ? 'admin' : $managedBranch;
        $allowedLoginCodes = $managedBranch === null
            ? collect()
            : $this->allowedLoginCodesForBranch($managedBranch);

        $load = function () use ($managedBranch, $allowedLoginCodes, $includeAll): array {
            $query = DB::table('notifications')->whereNull('archive_id');

            if ($managedBranch !== null) {
                $query->where(function ($query) use ($managedBranch): void {
                    $query
                        ->whereNull('target_branch_code')
                        ->orWhere('target_branch_code', $managedBranch);
                });
            }

            return $query
                ->orderByDesc('created_at')
                ->when(! $includeAll, fn ($query) => $query->limit(1000))
                ->get()
                ->map(fn ($item): array => [
                    'id' => $item->id,
                    'title' => $item->title,
                    'message' => $item->message,
                    'targetBranchId' => $item->target_branch_code,
                    'targetLoginIds' => $this->decodeArray($item->target_login_ids),
                    'createdAt' => (string) $item->created_at,
                    'createdByRole' => $item->created_by_role,
                    'createdByName' => $item->created_by_name,
                ])
                ->filter(fn (array $item): bool => $managedBranch === null
                    || $this->notificationIsVisibleToBranch($item, $managedBranch, $allowedLoginCodes))
                ->values()
                ->all();
        };

        return $includeAll
            ? $load()
            : $this->remember(self::NOTIFICATIONS_CACHE_KEY.':'.$cacheScope, now()->addMinutes(10), $load);
    }

    public function addNotification(array $input): array
    {
        $id = (string) str()->uuid();
        $timestamp = now();
        $user = $this->currentUser();
        $role = (string) ($user?->role ?? '');
        $targetBranchCode = trim((string) ($input['targetBranchId'] ?? '')) ?: null;
        $targetBranchCode = $targetBranchCode === 'all' ? null : $targetBranchCode;
        $targetLoginIds = $this->normalizeLoginIds($input['targetLoginIds'] ?? []);
        $managedBranch = $this->managedBranchCode();

        if ($managedBranch !== null) {
            $targetBranchCode = $managedBranch;
            $this->assertLoginIdsBelongToBranch($targetLoginIds, $managedBranch);
        } elseif (in_array($role, ['student', 'trainee'], true)) {
            $targetBranchCode = $this->studentBranchCode((string) $user?->login_code);
            $targetLoginIds = [];

            if ($targetBranchCode === null) {
                throw new AuthorizationException;
            }
        } elseif ($user && $role !== 'admin') {
            throw new AuthorizationException;
        }

        [$createdByName, $createdByRole] = $this->actorIdentity($user);

        DB::table('notifications')->insert([
            'id' => $id,
            'title' => $input['title'],
            'message' => $input['message'],
            'target_branch_code' => $targetBranchCode,
            'target_login_ids' => json_encode($targetLoginIds, JSON_UNESCAPED_UNICODE),
            'created_by_name' => $createdByName,
            'created_by_role' => $createdByRole,
            'created_at' => $timestamp,
        ]);

        $this->clearCaches();
        $payload = [
            'id' => $id,
            'title' => $input['title'],
            'message' => $input['message'],
            'targetBranchId' => $targetBranchCode,
            'targetLoginIds' => $targetLoginIds,
            'createdByName' => $createdByName,
            'createdByRole' => $createdByRole,
            'createdAt' => $timestamp->toISOString(),
        ];

        event(new DashboardNotificationCreated($payload));

        return $payload;
    }

    public function deleteNotification(string $notificationId): void
    {
        $notification = DB::table('notifications')->where('id', $notificationId)->first();

        if (! $notification) {
            if ($this->currentActorRole() === 'admin') {
                return;
            }

            throw new AuthorizationException;
        }

        $this->assertCanManageNotification($notification);
        DB::table('notifications')->where('id', $notificationId)->delete();
        $this->clearCaches();

        event(new DashboardNotificationDeleted($notificationId));
    }
}
