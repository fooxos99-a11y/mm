<?php

namespace App\Services\Concerns;

use App\Models\Branch;
use App\Models\RegistrationRequest;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

trait SupportsRegistrationRequests
{
    private function isRegistrationOpen(): bool
    {
        return (string) DB::table('registration_settings')->where('key', 'is_open')->value('value') === '1';
    }

    private function assertRegistrationLoginCodeAvailable(?string $loginCode, ?string $exceptRequestId = null): void
    {
        $loginCode = trim((string) $loginCode);
        if ($loginCode === '') {
            throw ValidationException::withMessages(['loginCode' => 'أدخل رقم الدخول.']);
        }

        if (Student::query()->where('login_code', $loginCode)->exists() || User::query()->where('login_code', $loginCode)->exists()) {
            throw ValidationException::withMessages(['loginCode' => 'رقم الدخول مستخدم مسبقًا.']);
        }

        $requestQuery = RegistrationRequest::query()->where('login_code', $loginCode)->whereIn('status', ['pending', 'accepted']);
        if ($exceptRequestId) {
            $requestQuery->where('id', '!=', $exceptRequestId);
        }
        if ($requestQuery->exists()) {
            throw ValidationException::withMessages(['loginCode' => 'يوجد طلب مسجل بهذا الرقم بالفعل.']);
        }
    }

    private function serializeRegistrationRequest(RegistrationRequest $request): array
    {
        return [
            'id' => $request->id,
            'name' => $request->full_name,
            'loginCode' => $request->login_code,
            'phone' => $request->phone ?: $this->registrationMetadataService->phone($request->id),
            'age' => $request->status === 'pending' ? $this->registrationMetadataService->age($request->id) : null,
            'gender' => $request->gender ?: $this->registrationMetadataService->gender($request->id),
            'answers' => is_array($request->answers) ? $request->answers : $this->registrationMetadataService->answers($request->id),
            'branchId' => $request->branch_code ?: null,
            'note' => $request->note ?? '',
            'status' => $request->status,
            'decisionReason' => $request->decision_reason ?? '',
            'reviewedAt' => optional($request->reviewed_at)?->toISOString(),
            'createdAt' => optional($request->created_at)?->toISOString() ?? now()->toISOString(),
        ];
    }

    private function registrationRequestBranchCode(string $requestId): string
    {
        $gender = RegistrationRequest::query()->whereKey($requestId)->value('gender') ?: $this->registrationMetadataService->gender($requestId);

        return $gender === 'female' ? 'female' : 'male';
    }

    public function serializeStudentRegistrationProfile(?RegistrationRequest $request): ?array
    {
        if (! $request) {
            return null;
        }

        return [
            'loginCode' => $request->login_code,
            'phone' => $request->phone,
            'gender' => $request->gender,
            'answers' => is_array($request->answers) ? array_values($request->answers) : [],
        ];
    }

    private function resolveManagedBranchCode(?string $role): string
    {
        return match ($role) {
            'male_manager' => 'male',
            'female_manager' => 'female',
            default => '',
        };
    }

    private function findBranchByCode(string $branchCode): Branch
    {
        $branch = Branch::query()->where('code', $branchCode)->first();
        if (! $branch) {
            throw ValidationException::withMessages(['branchId' => 'Invalid branch.']);
        }

        return $branch;
    }
}
