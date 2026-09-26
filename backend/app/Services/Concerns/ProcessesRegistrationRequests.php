<?php

namespace App\Services\Concerns;

use App\Models\RegistrationRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

trait ProcessesRegistrationRequests
{
    public function createRegistrationRequest(
        string $name,
        string $phone,
        string $gender,
        array $answers = [],
        ?int $legacyAge = null
    ): array {
        if (! $this->isRegistrationOpen()) {
            throw ValidationException::withMessages(['registration' => 'التسجيل مغلق حاليًا.']);
        }

        $name = trim($name);
        $phone = trim($phone);

        if ($name === '') {
            throw ValidationException::withMessages(['name' => 'أدخل الاسم.']);
        }
        if (! preg_match('/^\d{10}$/', $phone)) {
            throw ValidationException::withMessages(['phone' => 'رقم الجوال يجب أن يتكون من 10 أرقام.']);
        }
        if (! in_array($gender, ['male', 'female'], true)) {
            throw ValidationException::withMessages(['gender' => 'اختر الجنس.']);
        }
        if ($legacyAge !== null && ! array_key_exists('age', $answers)) {
            $answers['age'] = (string) $legacyAge;
        }

        $answers = $this->registrationFormService->normalizeAnswers($answers);
        $request = RegistrationRequest::query()->create([
            'full_name' => $name,
            'login_code' => null,
            'initial_password' => null,
            'phone' => $phone,
            'gender' => $gender,
            'answers' => $answers,
            'branch_code' => null,
            'note' => null,
            'status' => 'pending',
        ]);

        $this->registrationMetadataService->store($request->id, $phone, $gender, $answers, $legacyAge);

        return $this->serializeRegistrationRequest($request);
    }

    public function acceptRegistrationRequest(string $requestId, array $data): array
    {
        $registrationRequest = $this->pendingRegistrationRequest($requestId);
        $name = trim((string) $data['name']);
        $loginCode = trim((string) $data['loginCode']);
        $phone = trim((string) $data['phone']);
        $gender = (string) $data['gender'];
        $answers = $this->registrationFormService->normalizeAnswers($data['answers'] ?? []);
        $this->assertRegistrationLoginCodeAvailable($loginCode, $registrationRequest->id);
        $branch = $this->findBranchByCode((string) $data['branchId']);
        $passwordHash = Hash::make((string) $data['password']);

        DB::transaction(function () use (
            $registrationRequest,
            $branch,
            $passwordHash,
            $name,
            $loginCode,
            $phone,
            $gender,
            $answers
        ): void {
            $student = $this->studentAccountService->create(
                $name,
                $loginCode,
                $branch->code,
                '',
                $passwordHash,
            );
            $registrationRequest->forceFill([
                'full_name' => $name,
                'login_code' => $loginCode,
                'phone' => $phone,
                'gender' => $gender,
                'answers' => $answers,
                'branch_code' => $branch->code,
                'initial_password' => null,
                'status' => 'accepted',
                'reviewed_by' => auth()->id(),
                'reviewed_at' => now(),
                'decision_reason' => 'تم القبول وإنشاء سجل المعلم/ة وحساب الدخول.',
                'note' => $student->note,
                'student_id' => $student->id,
            ])->save();

            $this->registrationMetadataService->store(
                $registrationRequest->id,
                $phone,
                $gender,
                $answers,
                null,
            );
        });

        return $this->serializeRegistrationRequest($registrationRequest->fresh());
    }

    public function rejectRegistrationRequest(string $requestId, string $reason = ''): array
    {
        $registrationRequest = $this->pendingRegistrationRequest($requestId);
        $registrationRequest->forceFill([
            'initial_password' => null,
            'status' => 'rejected',
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
            'decision_reason' => trim($reason),
        ])->save();
        $this->registrationMetadataService->forget($registrationRequest->id);

        return $this->serializeRegistrationRequest($registrationRequest);
    }

    public function markRegistrationRequestAccepted(string $requestId): array
    {
        $registrationRequest = $this->pendingRegistrationRequest($requestId);
        $registrationRequest->forceFill([
            'initial_password' => null,
            'status' => 'accepted',
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
            'decision_reason' => 'تم اعتماد الطلب يدويًا دون إنشاء حساب جديد.',
        ])->save();
        $this->registrationMetadataService->forget($registrationRequest->id);

        return $this->serializeRegistrationRequest($registrationRequest);
    }

    private function pendingRegistrationRequest(string $requestId): RegistrationRequest
    {
        $request = RegistrationRequest::query()->find($requestId);
        if (! $request) {
            throw ValidationException::withMessages(['requestId' => 'طلب التسجيل غير موجود.']);
        }
        if ($request->status !== 'pending') {
            throw ValidationException::withMessages(['requestId' => 'تمت معالجة هذا الطلب مسبقًا.']);
        }

        return $request;
    }
}
