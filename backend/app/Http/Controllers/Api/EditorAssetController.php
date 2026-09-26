<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CoreData\StoreEditorImageRequest;
use App\Services\EditorAssetService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class EditorAssetController extends Controller
{
    public function __construct(private readonly EditorAssetService $editorAssetService)
    {
    }

    public function store(StoreEditorImageRequest $request): JsonResponse
    {
        $data = $request->validated();

        return response()->json(
            $this->editorAssetService->create(
                $data['image'],
                $request->user() ? (string) $request->user()->getAuthIdentifier() : null,
                $request->getSchemeAndHttpHost(),
            ),
            Response::HTTP_CREATED,
        );
    }
}
