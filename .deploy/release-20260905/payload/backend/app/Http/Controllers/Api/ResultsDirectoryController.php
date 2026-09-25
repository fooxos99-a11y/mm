<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ResultsDirectoryRequest;
use App\Services\ResultsDirectoryService;
use Illuminate\Http\JsonResponse;

class ResultsDirectoryController extends Controller
{
    public function catalog(ResultsDirectoryService $service): JsonResponse
    {
        return response()->json($service->catalog());
    }

    public function index(ResultsDirectoryRequest $request, ResultsDirectoryService $service): JsonResponse
    {
        return response()->json($service->paginate($request->user(), $request->validated()));
    }
}
