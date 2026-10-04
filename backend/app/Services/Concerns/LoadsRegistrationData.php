<?php

namespace App\Services\Concerns;

use App\Models\Branch;
use App\Models\RegistrationRequest;
use Illuminate\Support\Facades\DB;

trait LoadsRegistrationData
{
    public function loadRegistrationPublicStatus(): array
    {
        return [
            'isOpen' => $this->isRegistrationOpen(),
            'fields' => $this->registrationFormService->load(),
            'fixedLabels' => $this->registrationFormService->loadFixedLabels(),
            'branches' => Branch::query()->orderBy('created_at')->get()
                ->map(fn (Branch $branch) => ['id' => $branch->code, 'label' => $branch->name])
                ->values()->all(),
        ];
    }

    public function loadRegistrationDashboardData(): array
    {
        $origin = rtrim((string) config('app.frontend_url', config('app.url', 'http://127.0.0.1:8080')), '/');
        $managedBranch = $this->resolveManagedBranchCode(auth()->user()?->role);
        $requestsQuery = RegistrationRequest::query();

        if ($managedBranch !== '') {
            $requestsQuery->where(function ($query) use ($managedBranch): void {
                $query->where('branch_code', $managedBranch)
                    ->orWhere(function ($legacyQuery) use ($managedBranch): void {
                        $legacyQuery->where(function ($emptyBranchQuery): void {
                            $emptyBranchQuery->whereNull('branch_code')->orWhere('branch_code', '');
                        })->where(function ($genderQuery) use ($managedBranch): void {
                            $genderQuery->where('gender', $managedBranch)
                                ->orWhereNull('gender')->orWhere('gender', '');
                        });
                    });
            });
        }

        $requests = $requestsQuery
            ->orderByRaw("case when status = 'pending' then 0 when status = 'accepted' then 1 else 2 end")
            ->orderByDesc('created_at')->get();

        if ($managedBranch !== '') {
            // Legacy requests can still keep their gender in registration metadata.
            $requests = $requests->filter(
                fn (RegistrationRequest $request) => $this->resolveRegistrationRequestBranch($request) === $managedBranch
            )->values();
        }

        return [
            'isOpen' => $this->isRegistrationOpen(),
            'registrationUrl' => $origin.'/registration',
            'fields' => $this->registrationFormService->load(),
            'fixedLabels' => $this->registrationFormService->loadFixedLabels(),
            'requests' => $requests->map(
                fn (RegistrationRequest $request) => $this->serializeRegistrationRequest($request)
            )
                ->all(),
        ];
    }

    public function updateRegistrationSettings(bool $isOpen): void
    {
        DB::table('registration_settings')->updateOrInsert(
            ['key' => 'is_open'],
            ['value' => $isOpen ? '1' : '0', 'updated_at' => now()],
        );
    }

    public function loadRegistrationFormFields(): array
    {
        return $this->registrationFormService->load();
    }

    public function updateRegistrationFormFields(array $fields, ?array $fixedLabels = null): array
    {
        return [
            'fields' => $this->registrationFormService->update($fields),
            'fixedLabels' => $fixedLabels === null
                ? $this->registrationFormService->loadFixedLabels()
                : $this->registrationFormService->updateFixedLabels($fixedLabels),
        ];
    }
}
