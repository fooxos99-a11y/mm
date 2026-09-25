<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PeopleDirectoryRequest;
use App\Services\PeopleDirectoryService;
use App\Services\PeopleEditorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PeopleDirectoryController extends Controller
{
    public function __invoke(PeopleDirectoryRequest $request, PeopleDirectoryService $service): JsonResponse
    {
        return response()->json($service->paginate($request->user(), $request->validated()));
    }

    public function options(PeopleDirectoryRequest $request, PeopleEditorService $service): JsonResponse
    {
        return response()->json($service->options($request->user(), $request->validated()));
    }

    public function detail(Request $request, PeopleEditorService $service, string $type, string $id): JsonResponse
    {
        return response()->json($service->detail($request->user(), $type, $id));
    }
}
