<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CoreData\StoreTrainingMaterialRequest;
use App\Http\Requests\CoreData\UpdateTrainingMaterialRequest;
use App\Services\TrainingMaterialAttachmentService;
use App\Services\TrainingMaterialRequestData;
use App\Services\TrainingMaterialService;
use App\Services\TrainingPdfPreviewService;
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

        $material = $this->trainingMaterialService->create(
            $data['title'],
            (string) ($data['description'] ?? ''),
            $data['branchId'] ?? null,
            $this->requestData->attachments($request),
        );

        return response()->json($material, 201);
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
        $path = $media->getPath();
        $previewPath = app(TrainingPdfPreviewService::class)->path($media);
        if ($request->boolean('preview') && ! $request->boolean('download')
            && $media->mime_type === 'application/pdf' && is_file($previewPath)) {
            $path = $previewPath;
        }
        $response = response()->file($path, [
            'Content-Type' => $media->mime_type ?: 'application/octet-stream',
            'Accept-Ranges' => 'bytes',
            'Cache-Control' => 'private, no-cache',
            'X-Content-Type-Options' => 'nosniff',
        ]);
        $name = $media->getCustomProperty('original_client_name') ?: $media->file_name;
        $response->setContentDisposition($request->boolean('download') ? 'attachment' : 'inline', $name);
        $response->setEtag(hash('sha256', $media->id.':'.filesize($path).':'.filemtime($path)));
        $response->setLastModified(\DateTimeImmutable::createFromFormat('U', (string) filemtime($path)));

        return $response;
    }
}
