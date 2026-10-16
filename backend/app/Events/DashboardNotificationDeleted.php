<?php

namespace App\Events;

use App\Support\DepartmentContext;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DashboardNotificationDeleted implements ShouldBroadcastNow
{
    use Dispatchable;
    use SerializesModels;

    public readonly ?string $departmentId;

    public function __construct(public readonly string $notificationId)
    {
        $this->departmentId = DepartmentContext::id();
    }

    public function broadcastOn(): array
    {
        if ($this->departmentId === null) {
            return [];
        }
        $prefix = "departments.{$this->departmentId}.";
        return [new PrivateChannel($prefix.'dashboard.notifications.admin')];
    }

    public function broadcastAs(): string
    {
        return 'dashboard.notification.deleted';
    }

    public function broadcastWith(): array
    {
        return ['notificationId' => $this->notificationId];
    }
}
