<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Assessment\StoreSatisfactionQuestionRequest;
use App\Http\Requests\Assessment\StoreSatisfactionResponsesRequest;
use App\Services\AssessmentAccessService;
use App\Services\SatisfactionService;
use Illuminate\Http\JsonResponse;

class SatisfactionController extends Controller
{
    public function __construct(
        private readonly AssessmentAccessService $accessService,
        private readonly SatisfactionService $satisfactionService,
    ) {}

    public function storeQuestion(StoreSatisfactionQuestionRequest $request): JsonResponse
    {
        $data = $request->validated();

        return response()->json(
            $this->satisfactionService->addSatisfactionQuestion(
                $data['prompt'],
                $data['type'],
                $data['isRequired'],
                (string) ($data['targetScope'] ?? 'all'),
                $data['courseId'] ?? null,
            ),
            201,
        );
    }

    public function destroyQuestion(string $questionId): JsonResponse
    {
        $this->satisfactionService->deleteSatisfactionQuestion($questionId);

        return response()->json(status: 204);
    }

    public function storeResponses(StoreSatisfactionResponsesRequest $request): JsonResponse
    {
        $responses = $this->accessService->prepareSatisfactionResponses(
            $request->user(),
            $request->is('api/public/*'),
            $request->validated('responses'),
        );

        return response()->json($this->satisfactionService->submitSatisfactionResponses($responses));
    }
}
