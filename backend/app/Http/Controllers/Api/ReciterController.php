<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CoreData\StoreReciterRequest;
use App\Services\ManagedPeopleAccountService;
use App\Services\ReciterAccessService;
use App\Services\UserManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ReciterController extends Controller
{
    public function __construct(
        private readonly ReciterAccessService $reciterAccessService,
        private readonly UserManagementService $userManagementService,
        private readonly ManagedPeopleAccountService $accounts,
    ) {
    }

    public function store(StoreReciterRequest $request): JsonResponse
    {
        $reciter = $this->accounts->saveReciter($request->validated());

        return response()->json([
            'id' => $reciter->id,
            'name' => $reciter->full_name,
            'phone' => $reciter->phone,
            'loginCode' => $reciter->user?->login_code,
            'branchId' => $reciter->branch?->code,
            'studentIds' => $reciter->students->pluck('id')->all(),
        ]);
    }

    public function show(Request $request, string $loginCode): Response
    {
        $this->reciterAccessService->assertCanViewAccount($request->user(), $loginCode);

        return $this->jsonOrNull($this->userManagementService->getReciterAccountByLoginCode($loginCode));
    }

    public function destroy(Request $request, string $loginCode): JsonResponse
    {
        $this->reciterAccessService->assertCanManageBranch($request->user(), $loginCode);

        return response()->json([
            'id' => $this->userManagementService->deleteReciterByLoginCode($loginCode),
        ]);
    }

    public function assignedToStudent(Request $request, string $loginCode): Response
    {
        $this->reciterAccessService->assertCanViewAssignedReciter($request->user(), $loginCode);

        return $this->jsonOrNull($this->userManagementService->getStudentAssignedReciterByLoginCode($loginCode));
    }

    private function jsonOrNull(?array $payload): Response
    {
        return $payload === null
            ? response('null', 200, ['Content-Type' => 'application/json'])
            : response()->json($payload);
    }
}
