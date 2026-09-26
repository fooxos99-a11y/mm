<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CoreData\SetRolePermissionRequest;
use App\Services\CoreDataService;
use Illuminate\Http\JsonResponse;

class RolePermissionController extends Controller
{
    public function __construct(private readonly CoreDataService $coreDataService)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json($this->coreDataService->loadRolePermissions());
    }

    public function update(SetRolePermissionRequest $request): JsonResponse
    {
        $data = $request->validated();
        $this->coreDataService->setRolePermission($data['role'], $data['key'], $data['isEnabled']);

        return response()->json(status: 204);
    }
}
