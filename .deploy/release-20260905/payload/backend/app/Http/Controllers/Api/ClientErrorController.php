<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ClientErrorRequest;
use App\Services\OperationalMetricsService;
use Illuminate\Http\JsonResponse;

class ClientErrorController extends Controller
{
    public function __invoke(ClientErrorRequest $request, OperationalMetricsService $metrics): JsonResponse
    {
        $metrics->recordClientError();

        return response()->json(status: 204);
    }
}
