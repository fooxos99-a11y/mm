<?php

namespace App\Services;

use App\Models\Media;
use App\Models\TrainingMaterial;
use App\Models\User;

class TrainingMaterialAttachmentService
{
    public function __construct(private readonly TrainingMaterialAccessService $accessService)
    {
    }

    public function findAuthorized(?User $user, string $attachmentId): Media
    {
        $media = Media::query()
            ->where('collection_name', 'attachments')
            ->where(function ($query) use ($attachmentId): void {
                $query->where('uuid', $attachmentId);

                if (ctype_digit($attachmentId)) {
                    $query->orWhere('id', (int) $attachmentId);
                }
            })
            ->firstOrFail();

        abort_unless($media->model_type === TrainingMaterial::class, 404);
        $material = TrainingMaterial::query()->findOrFail($media->model_id);
        $this->accessService->assertCanView($user, $material);

        return $media;
    }
}
