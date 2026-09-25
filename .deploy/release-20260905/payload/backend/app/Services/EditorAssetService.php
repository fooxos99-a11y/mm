<?php

namespace App\Services;

use App\Models\EditorAsset;
use Illuminate\Http\UploadedFile;

class EditorAssetService
{
    public function create(UploadedFile $image, ?string $createdBy, string $origin): array
    {
        $editorAsset = EditorAsset::query()->create(['created_by' => $createdBy]);
        $media = $editorAsset
            ->addMedia($image)
            ->usingName(pathinfo($image->getClientOriginalName(), PATHINFO_FILENAME))
            ->usingFileName($image->hashName())
            ->toMediaCollection('editor-images', 'public');

        $basePath = trim((string) config('app.public_base_path', ''), '/');
        $pathPrefix = $basePath === '' ? '' : '/'.$basePath;

        return [
            'id' => $media->uuid ?? (string) $media->id,
            'name' => $media->name,
            'url' => rtrim($origin, '/').$pathPrefix.'/storage/'.ltrim($media->getPathRelativeToRoot(), '/'),
        ];
    }
}
