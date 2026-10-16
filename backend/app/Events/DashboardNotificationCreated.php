<?php

namespace App\Events;

use App\Support\DepartmentContext;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DashboardNotificationCreated implements ShouldBroadcastNow
{
    use Dispatchable;
    use SerializesModels;

    public readonly ?string $departmentId;

    public function __construct(public readonly array $notification)
    {
        $this->departmentId = DepartmentContext::id();
    }

    public function broadcastOn(): array
    {
        if ($this->departmentId === null) {
            return [];
        }
        $prefix = "departments.{$this->departmentId}.";
        $branch = (string) ($this->notification['targetBranchId'] ?? '');
        $loginIds = collect($this->notification['targetLoginIds'] ?? [])
            ->filter(fn (mixed $loginId): bool => trim((string) $loginId) !== '')
            ->unique()
            ->values();

        if ($loginIds->isNotEmpty()) {
            return $loginIds
                ->map(fn (string $loginId) => new PrivateChannel($prefix."dashboard.notifications.user.{$loginId}"))
                ->all();
        }

        if (in_array($branch, ['male', 'female'], true)) {
            return [new PrivateChannel($prefix."dashboard.notifications.{$branch}")];
        }

        return [new PrivateChannel($prefix.'dashboard.notifications.all')];
    }

    public function broadcastAs(): string
    {
        return 'dashboard.notification.created';
    }

    public function broadcastWith(): array
    {
        return ['notification' => $this->notification];
    }
}
