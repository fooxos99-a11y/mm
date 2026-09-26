<?php

namespace App\Http\Controllers;

use App\Http\Requests\Completion\UpdateCompletionRequirementsRequest;
use App\Services\CompletionRequirementsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompletionRequirementsController extends Controller
{
    public function __construct(private readonly CompletionRequirementsService $service)
    {
    }

    public function show(string $branchCode): JsonResponse
    {
        return response()->json($this->service->branchPayload($branchCode));
    }

    public function update(UpdateCompletionRequirementsRequest $request, string $branchCode): JsonResponse
    {
        $data = $request->validated();

        return response()->json($this->service->updateSettings($branchCode, $data));
    }

    public function close(Request $request, string $branchCode): JsonResponse
    {
        return response()->json($this->service->closeBranch($branchCode, (string) $request->user()->id));
    }

    public function reopen(string $branchCode): JsonResponse
    {
        return response()->json($this->service->reopenBranch($branchCode));
    }
}
