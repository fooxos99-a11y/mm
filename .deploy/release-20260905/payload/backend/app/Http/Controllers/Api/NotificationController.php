<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CoreData\StoreNotificationRequest;
use App\Services\CoreDataService;
use Illuminate\Http\JsonResponse;

class NotificationController extends Controller
{
    public function __construct(private readonly CoreDataService $coreDataService) {}

    public function index(): JsonResponse
    {
        return response()->json($this->coreDataService->loadNotifications());
    }

    public function store(StoreNotificationRequest $request): JsonResponse
    {
        return response()->json(
            $this->coreDataService->addNotification($request->validated()),
            201,
        );
    }

    public function destroy(string $notificationId): JsonResponse
    {
        $this->coreDataService->deleteNotification($notificationId);

        return response()->json(status: 204);
    }
}
