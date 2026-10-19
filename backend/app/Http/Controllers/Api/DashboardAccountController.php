<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CoreData\StoreDashboardAccountRequest;
use App\Http\Requests\CoreData\UpdateDashboardAccountRequest;
use App\Services\DashboardAccessHistory;
use App\Services\DashboardAccountService;
use Illuminate\Http\JsonResponse;

class DashboardAccountController extends Controller
{
    public function __construct(private readonly DashboardAccountService $dashboardAccountService)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json($this->dashboardAccountService->list());
    }

    public function store(StoreDashboardAccountRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $this->dashboardAccountService->create(
            $data['name'],
            $data['loginCode'],
            $data['role'],
            $data['password'],
        );

        return response()->json($this->dashboardAccountService->serialize($user), 201);
    }

    public function update(string $accountId, UpdateDashboardAccountRequest $request): JsonResponse
    {
        return response()->json($this->dashboardAccountService->update($accountId, $request->validated()));
    }

    public function history(DashboardAccessHistory $history): JsonResponse
    {
        return response()->json($history->latest());
    }

    public function destroy(string $accountId): JsonResponse
    {
        $this->dashboardAccountService->delete($accountId);

        return response()->json(status: 204);
    }
}
