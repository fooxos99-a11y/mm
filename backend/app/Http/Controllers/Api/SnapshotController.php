<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CoreDataService;
use App\Services\DashboardShellService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SnapshotController extends Controller
{
    public function __construct(private readonly CoreDataService $coreDataService) {}

    public function snapshot(Request $request): JsonResponse
    {
        $data = $request->validate(['page' => ['sometimes', 'integer', 'min:1', 'max:100000']]);

        return response()->json($this->coreDataService->loadDashboardSnapshot(page: (int) ($data['page'] ?? 1)));
    }

    public function publicStats(): JsonResponse
    {
        return response()->json($this->coreDataService->loadPublicStats());
    }

    public function shell(Request $request, DashboardShellService $shell): JsonResponse
    {
        return response()->json($shell->load($request->user()));
    }
}
