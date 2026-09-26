<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CoreData\StoreReciterRequest;
use App\Services\ReciterAccessService;
use App\Services\UserManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class ReciterController extends Controller
{
    public function __construct(
        private readonly ReciterAccessService $reciterAccessService,
        private readonly UserManagementService $userManagementService,
    ) {
    }

    public function store(StoreReciterRequest $request): JsonResponse
    {
        $data = $request->validated();
        $reciter = $this->userManagementService->saveReciter(
            $data['currentLoginCode'] ?? null,
            $data['name'],
            $data['loginCode'],
            $data['branchId'],
            $data['linkedStudentIds'] ?? [],
            filled($data['password'] ?? null) ? Hash::make($data['password']) : null,
        );

        return response()->json([
            'id' => $reciter->id,
            'name' => $reciter->full_name,
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
