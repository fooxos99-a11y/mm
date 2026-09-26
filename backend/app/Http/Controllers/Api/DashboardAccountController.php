<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CoreData\StoreDashboardAccountRequest;
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

        return response()->json([
            'id' => $user->id,
            'name' => $user->full_name,
            'loginCode' => $user->login_code,
            'role' => $user->role,
        ], 201);
    }

    public function destroy(string $accountId): JsonResponse
    {
        $this->dashboardAccountService->delete($accountId);

        return response()->json(status: 204);
    }
}
