<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CoreData\StoreTrainingMaterialRequest;
use App\Http\Requests\CoreData\UpdateTrainingMaterialRequest;
use App\Services\TrainingMaterialAttachmentService;
use App\Services\TrainingMaterialRequestData;
use App\Services\TrainingMaterialService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class TrainingMaterialController extends Controller
{
    public function __construct(
        private readonly TrainingMaterialAttachmentService $attachmentService,
        private readonly TrainingMaterialRequestData $requestData,
        private readonly TrainingMaterialService $trainingMaterialService,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json($this->trainingMaterialService->list());
    }

    public function store(StoreTrainingMaterialRequest $request): JsonResponse
    {
        $data = $request->validated();

        return response()->json($this->trainingMaterialService->create(
            $data['title'],
            (string) ($data['description'] ?? ''),
            $data['branchId'] ?? null,
            $this->requestData->attachments($request),
        ), 201);
    }

    public function update(UpdateTrainingMaterialRequest $request, string $materialId): JsonResponse
    {
        $data = $request->validated();

        return response()->json($this->trainingMaterialService->update(
            $materialId,
            $data['title'],
            (string) ($data['description'] ?? ''),
            $data['branchId'] ?? null,
            $this->requestData->attachments($request, true),
        ));
    }

    public function destroy(string $materialId): JsonResponse
    {
        $this->trainingMaterialService->delete($materialId);

        return response()->json(status: 204);
    }

    public function attachment(Request $request, string $attachmentId): BinaryFileResponse
    {
        $media = $this->attachmentService->findAuthorized($request->user(), $attachmentId);

        return response()->file($media->getPath(), [
            'Content-Type' => $media->mime_type ?: 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="'.addslashes($media->file_name).'"',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
