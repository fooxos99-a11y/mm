<?php

namespace App\Services;

use Illuminate\Http\Request;

class TrainingMaterialRequestData
{
    public function attachments(Request $request, bool $allowExisting = false): array
    {
        $attachments = [];

        foreach (($request->input('attachments', []) ?: []) as $index => $attachment) {
            $file = data_get($request->file('attachments', []), $index.'.file');
            $attachmentId = trim((string) ($attachment['id'] ?? ''));
            $url = trim((string) ($attachment['url'] ?? ''));

            if (! $file && $url === '' && (! $allowExisting || $attachmentId === '')) {
                continue;
            }

            $attachments[] = [
                'id' => $attachmentId,
                'label' => (string) ($attachment['label'] ?? ''),
                'file' => $file,
                'url' => $url,
            ];
        }

        if ($attachments !== []) {
            return $attachments;
        }

        return collect($request->file('files', []))
            ->filter()
            ->map(fn ($file) => [
                'id' => '',
                'label' => pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
                'file' => $file,
            ])
            ->values()
            ->all();
    }
}
