<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CoreData\StoreTaskTemplateRequest;
use App\Http\Requests\CoreData\UpdateTaskTemplateRequest;
use App\Services\CoreDataService;
use Illuminate\Http\JsonResponse;

class TaskTemplateController extends Controller
{
    public function __construct(private readonly CoreDataService $coreDataService)
    {
    }

    public function store(StoreTaskTemplateRequest $request): JsonResponse
    {
        $data = $request->validated();

        return response()->json(
            $this->coreDataService->createTaskTemplate($data['name'], (string) ($data['content'] ?? '')),
            201,
        );
    }

    public function update(UpdateTaskTemplateRequest $request, string $templateId): JsonResponse
    {
        $this->coreDataService->updateTaskTemplate($templateId, $request->validated());

        return response()->json(status: 204);
    }
}
