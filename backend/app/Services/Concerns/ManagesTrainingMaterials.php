<?php

namespace App\Services\Concerns;

use App\Models\TrainingMaterial;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

trait ManagesTrainingMaterials
{
    public function list(): array
    {
        $query = TrainingMaterial::query()->with(['media', 'branch']);
        $managedBranch = $this->managedBranchCode();

        if ($this->currentActorRole() !== 'admin') {
            if ($managedBranch === null) {
                throw new AuthorizationException;
            }
            $query->where(function ($query) use ($managedBranch): void {
                $query->whereNull('target_branch_code')
                    ->orWhere('target_branch_code', $managedBranch)
                    ->orWhere('target_branch_code', 'supervision');
            });
        }

        return $query->orderByDesc('created_at')->get()
            ->map(fn (TrainingMaterial $material): array => $this->serialize($material))
            ->values()->all();
    }

    public function create(string $title, string $description, ?string $branchCode, array $attachments): array
    {
        $branchCode = $this->writableBranchCode($branchCode);
        [$title, $description, $targetBranchCode] = $this->normalizeInput(
            $title,
            $description,
            $branchCode,
            $attachments
        );

        $material = DB::transaction(function () use (
            $title,
            $description,
            $targetBranchCode,
            $attachments
        ): TrainingMaterial {
            $material = TrainingMaterial::query()->create([
                'title' => $title,
                'description' => $description !== '' ? $description : null,
                'target_branch_code' => $targetBranchCode,
                'external_attachments' => $this->normalizeExternalAttachments($attachments),
                'created_by' => auth()->id(),
            ]);
            $this->syncAttachments($material, $attachments, false);

            return $material->fresh(['media', 'branch']);
        });

        $this->dashboardCommunicationService->clearCaches();

        return $this->serialize($material);
    }

    public function update(
        string $materialId,
        string $title,
        string $description,
        ?string $branchCode,
        array $attachments
    ): array {
        $material = TrainingMaterial::query()->with(['media', 'branch'])->find($materialId);
        if (! $material) {
            throw ValidationException::withMessages(['materialId' => 'المادة التدريبية المحددة غير موجودة.']);
        }

        $this->assertCanManageMaterial($material);
        $branchCode = $this->writableBranchCode($branchCode);
        [$title, $description, $targetBranchCode] = $this->normalizeInput(
            $title,
            $description,
            $branchCode,
            $attachments
        );

        $updatedMaterial = DB::transaction(function () use (
            $material,
            $title,
            $description,
            $targetBranchCode,
            $attachments
        ): TrainingMaterial {
            $material->forceFill([
                'title' => $title,
                'description' => $description !== '' ? $description : null,
                'target_branch_code' => $targetBranchCode,
                'external_attachments' => $this->normalizeExternalAttachments($attachments),
            ])->save();
            $this->syncAttachments($material, $attachments, true);

            return $material->fresh(['media', 'branch']);
        });

        $this->dashboardCommunicationService->clearCaches();

        return $this->serialize($updatedMaterial);
    }

    public function delete(string $materialId): void
    {
        $material = TrainingMaterial::query()->with('media')->find($materialId);
        if (! $material) {
            throw ValidationException::withMessages(['materialId' => 'المادة التدريبية المحددة غير موجودة.']);
        }

        $this->assertCanManageMaterial($material);
        $material->clearMediaCollection('attachments');
        $material->delete();
        $this->dashboardCommunicationService->clearCaches();
    }
}
