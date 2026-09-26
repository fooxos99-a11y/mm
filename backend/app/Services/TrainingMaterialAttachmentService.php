<?php

namespace App\Services;

use App\Models\TrainingMaterial;
use App\Models\User;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

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
        $this->accessService->assertCanView($user, $media->model);

        return $media;
    }
}
