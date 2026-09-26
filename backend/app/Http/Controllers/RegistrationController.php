<?php

namespace App\Http\Controllers;

use App\Http\Requests\Registration\AcceptRegistrationRequest;
use App\Http\Requests\Registration\RejectRegistrationRequest;
use App\Http\Requests\Registration\SubmitRegistrationRequest;
use App\Http\Requests\Registration\UpdateRegistrationFieldsRequest;
use App\Http\Requests\Registration\UpdateRegistrationSettingsRequest;
use App\Services\RegistrationService;
use Illuminate\Http\JsonResponse;

class RegistrationController extends Controller
{
    public function __construct(private readonly RegistrationService $registrationService) {}

    public function publicStatus(): JsonResponse
    {
        return response()->json($this->registrationService->loadRegistrationPublicStatus());
    }

    public function submit(SubmitRegistrationRequest $request): JsonResponse
    {
        $data = $request->validated();

        return response()->json(
            $this->registrationService->createRegistrationRequest(
                $data['name'],
                $data['phone'],
                $data['gender'],
                $data['answers'] ?? [],
                isset($data['age']) ? (int) $data['age'] : null,
            ),
            201,
        );
    }

    public function index(): JsonResponse
    {
        return response()->json($this->registrationService->loadRegistrationDashboardData());
    }

    public function updateSettings(UpdateRegistrationSettingsRequest $request): JsonResponse
    {
        $data = $request->validated();

        $this->registrationService->updateRegistrationSettings($data['isOpen']);

        return response()->json(status: 204);
    }

    public function updateFields(UpdateRegistrationFieldsRequest $request): JsonResponse
    {
        $data = $request->validated();

        return response()->json(
            $this->registrationService->updateRegistrationFormFields($data['fields'], $data['fixedLabels'] ?? null),
        );
    }

    public function accept(AcceptRegistrationRequest $request, string $requestId): JsonResponse
    {
        $data = $request->validated();

        return response()->json($this->registrationService->acceptRegistrationRequest($requestId, $data));
    }

    public function reject(RejectRegistrationRequest $request, string $requestId): JsonResponse
    {
        $data = $request->validated();

        return response()
            ->json($this->registrationService->rejectRegistrationRequest($requestId, (string) ($data['reason'] ?? '')));
    }

    public function markAccepted(string $requestId): JsonResponse
    {
        return response()->json($this->registrationService->markRegistrationRequestAccepted($requestId));
    }
}
