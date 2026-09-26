<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CoreData\UpdateHomePageContentRequest;
use App\Http\Requests\CoreData\UpdatePractitionerPageContentRequest;
use App\Services\PageContentService;
use Illuminate\Http\JsonResponse;

class PageContentController extends Controller
{
    public function __construct(private readonly PageContentService $pageContentService)
    {
    }

    public function updateHome(UpdateHomePageContentRequest $request): JsonResponse
    {
        return response()->json(
            $this->pageContentService->updateHomePageContent($request->validated('content')),
        );
    }

    public function updatePractitioner(UpdatePractitionerPageContentRequest $request): JsonResponse
    {
        return response()->json(
            $this->pageContentService->updatePractitionerPageContent($request->validated('content')),
        );
    }
}
