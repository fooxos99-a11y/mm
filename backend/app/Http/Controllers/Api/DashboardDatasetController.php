<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DashboardDatasetRequest;
use App\Services\DashboardDatasetService;
use Illuminate\Http\JsonResponse;

class DashboardDatasetController extends Controller
{
    public function __construct(private readonly DashboardDatasetService $dashboardDatasetService)
    {
    }

    public function index(DashboardDatasetRequest $request, string $dataset): JsonResponse
    {
        $data = $request->validated();

        return response()->json($this->dashboardDatasetService->paginate(
            $dataset,
            $request->user(),
            (int) ($data['perPage'] ?? 50),
            $data,
        ));
    }
}
