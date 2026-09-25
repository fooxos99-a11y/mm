<?php

namespace App\Http\Requests\CoreData\Concerns;

trait HasTrainingMaterialRules
{
    private const TRAINING_ATTACHMENT_MIME_TYPES = [
        'application/pdf',
        'application/zip',
        'application/x-zip-compressed',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'audio/mpeg',
        'audio/wav',
    ];

    /**
     * @return array<string, list<string>>
     */
    protected function trainingMaterialRules(bool $allowExistingAttachments): array
    {
        $mimeRule = 'mimetypes:'.implode(',', self::TRAINING_ATTACHMENT_MIME_TYPES);

        return [
            'title' => ['required', 'string'],
            'description' => ['nullable', 'string'],
            'branchId' => ['nullable', 'string'],
            'attachments' => ['sometimes', 'array', 'min:1'],
            'attachments.*.id' => $allowExistingAttachments ? ['sometimes', 'string'] : ['prohibited'],
            'attachments.*.label' => ['nullable', 'string'],
            'attachments.*.url' => ['nullable', 'url', 'max:2048'],
            'attachments.*.file' => ['nullable', 'file', $mimeRule, 'max:20480'],
            'files' => ['sometimes', 'array', 'min:1'],
            'files.*' => ['file', $mimeRule, 'max:20480'],
        ];
    }
}
