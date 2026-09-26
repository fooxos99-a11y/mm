<?php

namespace App\Services\Concerns;

use App\Models\Branch;
use App\Models\TrainingMaterial;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

trait SyncsTrainingMaterialAttachments
{
    private function normalizeInput(string $title, string $description, ?string $branchCode, array $attachments): array
    {
        $title = trim($title);
        $description = trim($description);
        $branchCode = $branchCode !== null ? trim($branchCode) : null;

        if ($title === '') {
            throw ValidationException::withMessages(['title' => 'عنوان المادة التدريبية مطلوب.']);
        }
        if ($attachments === []) {
            throw ValidationException::withMessages(['attachments' => 'أرفق ملفًا واحدًا على الأقل.']);
        }
        if ($branchCode === 'supervision') {
            return [$title, $description, 'supervision'];
        }
        if ($branchCode === null || $branchCode === '' || $branchCode === 'all') {
            return [$title, $description, null];
        }

        $branch = Branch::query()->where('code', $branchCode)->first();
        if (! $branch) {
            throw ValidationException::withMessages(['branchId' => 'الفرع المحدد غير موجود.']);
        }

        return [$title, $description, $branch->code];
    }

    private function syncAttachments(TrainingMaterial $material, array $attachments, bool $allowExisting): void
    {
        $mediaIndex = collect();
        foreach ($material->getMedia('attachments') as $media) {
            $mediaIndex->put((string) $media->id, $media);
            if ($media->uuid) {
                $mediaIndex->put((string) $media->uuid, $media);
            }
        }

        $keepMediaIds = [];
        foreach ($attachments as $index => $attachment) {
            $label = trim((string) ($attachment['label'] ?? ''));
            $url = trim((string) ($attachment['url'] ?? ''));
            $file = $attachment['file'] ?? null;
            $attachmentId = trim((string) ($attachment['id'] ?? ''));

            if ($label === '' && $url === '') {
                throw ValidationException::withMessages(
                    ["attachments.$index.label" => 'اسم الملف أو رابط المقطع مطلوب.']
                );
            }
            if ($url !== '') {
                continue;
            }
            if ($allowExisting && $attachmentId !== '') {
                $media = $mediaIndex->get($attachmentId);
                if (! $media) {
                    throw ValidationException::withMessages(
                        ["attachments.$index.id" => 'الملف المحدد غير موجود ضمن المادة التدريبية.']
                    );
                }
                $media->name = $label;
                $media->custom_properties = array_merge($media->custom_properties ?? [], ['display_name' => $label]);
                $media->save();
                $keepMediaIds[] = (string) $media->id;

                continue;
            }
            if (! $file) {
                throw ValidationException::withMessages(
                    ["attachments.$index.file" => 'اختر ملفًا أو أضف رابط يوتيوب.']
                );
            }

            $newMedia = $material->addMedia($file)
                ->usingName($label)
                ->usingFileName($file->hashName())
                ->withCustomProperties([
                    'display_name' => $label,
                    'original_client_name' => $file->getClientOriginalName(),
                ])
                ->toMediaCollection('attachments', 'public');
            $keepMediaIds[] = (string) $newMedia->id;
        }

        if ($allowExisting) {
            $material->getMedia('attachments')
                ->filter(fn ($media): bool => ! in_array((string) $media->id, $keepMediaIds, true))
                ->each(fn ($media) => $media->delete());
        }
    }

    private function normalizeExternalAttachments(array $attachments): array
    {
        return collect($attachments)->map(function (array $attachment): ?array {
            $url = trim((string) ($attachment['url'] ?? ''));
            if ($url === '' || $this->youtubeEmbedUrl($url) === '') {
                return null;
            }

            return [
                'id' => trim((string) ($attachment['id'] ?? '')) ?: (string) Str::uuid(),
                'label' => trim((string) ($attachment['label'] ?? '')) ?: 'مقطع يوتيوب',
                'url' => $url,
            ];
        })->filter()->values()->all();
    }
}
