<?php

namespace App\Services\Concerns;

use App\Models\TrainingMaterial;
use Illuminate\Support\Str;

trait SerializesTrainingMaterials
{
    public function serialize(TrainingMaterial $material): array
    {
        $basePath = trim((string) config('app.public_base_path', ''), '/');
        $pathPrefix = $basePath === '' ? '' : '/'.$basePath;
        $fileAttachments = $material->getMedia('attachments')->map(function ($media) use ($pathPrefix): array {
            $attachmentId = (string) ($media->uuid ?: $media->id);

            return [
                'id' => $attachmentId,
                'name' => $media->file_name,
                'displayName' => $media->getCustomProperty('display_name') ?: $media->name,
                'originalName' => $media->getCustomProperty('original_client_name') ?: $media->file_name,
                'mimeType' => $media->mime_type,
                'size' => (int) $media->size,
                'type' => 'file',
                'url' => request()->getSchemeAndHttpHost().$pathPrefix.'/api/training-material-attachments/'.rawurlencode($attachmentId),
            ];
        });
        $externalAttachments = collect($material->external_attachments ?? [])->map(fn (array $attachment): array => [
            'id' => (string) ($attachment['id'] ?? Str::uuid()),
            'name' => (string) ($attachment['label'] ?? 'مقطع يوتيوب'),
            'displayName' => (string) ($attachment['label'] ?? 'مقطع يوتيوب'),
            'originalName' => (string) ($attachment['url'] ?? ''),
            'mimeType' => 'text/html',
            'size' => 0,
            'type' => 'youtube',
            'url' => (string) ($attachment['url'] ?? ''),
            'embedUrl' => $this->youtubeEmbedUrl((string) ($attachment['url'] ?? '')),
        ])->filter(fn (array $attachment): bool => $attachment['embedUrl'] !== '');

        return [
            'id' => $material->id,
            'title' => $material->title,
            'description' => $material->description ?? '',
            'targetBranchId' => $material->target_branch_code ?: null,
            'targetBranchLabel' => $material->target_branch_code === 'supervision'
                ? 'الإشراف'
                : ($material->branch?->name ?? 'كل الفروع'),
            'attachments' => $fileAttachments->concat($externalAttachments)->values()->all(),
            'createdAt' => optional($material->created_at)?->toISOString() ?? now()->toISOString(),
        ];
    }

    private function youtubeEmbedUrl(string $url): string
    {
        $parts = parse_url(trim($url));
        $host = strtolower((string) ($parts['host'] ?? ''));
        $videoId = '';

        if (in_array($host, ['youtu.be', 'www.youtu.be'], true)) {
            $videoId = trim((string) ($parts['path'] ?? ''), '/');
        } elseif (in_array($host, ['youtube.com', 'www.youtube.com', 'm.youtube.com'], true)) {
            parse_str((string) ($parts['query'] ?? ''), $query);
            $videoId = (string) ($query['v'] ?? '');
            if ($videoId === '' && preg_match('~^/(?:embed|shorts)/([^/?]+)~', (string) ($parts['path'] ?? ''), $matches)) {
                $videoId = $matches[1];
            }
        }

        return preg_match('/^[A-Za-z0-9_-]{6,20}$/', $videoId) ? 'https://www.youtube.com/embed/'.$videoId : '';
    }
}
