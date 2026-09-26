<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DashboardNotificationDeleted implements ShouldBroadcastNow
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(public readonly string $notificationId)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('dashboard.notifications.admin')];
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
