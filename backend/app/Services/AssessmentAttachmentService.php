<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class AssessmentAttachmentService
{
    private const DIRECTORY = 'assessment-attachments';

    private const MAX_BYTES = 5 * 1024 * 1024;

    /** @return array{file_name: ?string, file_type: ?string, file_path: ?string, file_data_url: null} */
    public function storeAnswer(array $answer): array
    {
        $uploadedFile = $answer['file'] ?? null;

        if ($uploadedFile instanceof UploadedFile) {
            return [
                'file_name' => $uploadedFile->getClientOriginalName(),
                'file_type' => $uploadedFile->getMimeType() ?: $uploadedFile->getClientMimeType(),
                'file_path' => $this->storeUploadedFile($uploadedFile),
                'file_data_url' => null,
            ];
        }

        $legacyDataUrl = trim((string) ($answer['fileDataUrl'] ?? ''));
        if ($legacyDataUrl === '') {
            return [
                'file_name' => $answer['fileName'] ?? null,
                'file_type' => $answer['fileType'] ?? null,
                'file_path' => null,
                'file_data_url' => null,
            ];
        }

        $mimeType = strtolower(trim((string) ($answer['fileType'] ?? '')));

        return [
            'file_name' => $answer['fileName'] ?? null,
            'file_type' => $mimeType,
            'file_path' => $this->storeLegacyDataUrl($legacyDataUrl, $mimeType),
            'file_data_url' => null,
        ];
    }

    public function temporaryUrl(?string $path, ?string $legacyDataUrl = null): string
    {
        $path = trim((string) $path);
        if ($path === '') {
            return (string) ($legacyDataUrl ?? '');
        }

        try {
            return Storage::disk($this->disk())->temporaryUrl($path, now()->addMinutes(30));
        } catch (Throwable) {
            return '';
        }
    }

    public function delete(?string $path): void
    {
        $path = trim((string) $path);
        if ($path !== '') {
            try {
                Storage::disk($this->disk())->delete($path);
            } catch (Throwable) {
                // Cleanup must not invalidate an otherwise successful transaction.
            }
        }
    }

    public function deleteIfUnreferenced(string $path): void
    {
        foreach ([
            'course_questions' => 'attachment_path',
            'final_exam_questions' => 'attachment_path',
            'course_submission_answers' => 'file_path',
            'final_exam_submission_answers' => 'file_path',
        ] as $table => $column) {
            if (DB::table($table)->where($column, $path)->exists()) {
                return;
            }
        }

        $this->delete($path);
    }

    private function storeUploadedFile(UploadedFile $file): string
    {
        $extension = strtolower($file->guessExtension() ?: $file->getClientOriginalExtension() ?: 'bin');
        $path = self::DIRECTORY.'/'.str()->uuid().'.'.$extension;

        if (! Storage::disk($this->disk())->putFileAs(self::DIRECTORY, $file, basename($path))) {
            throw ValidationException::withMessages(['answers' => ['تعذر حفظ المرفق المرفوع.']]);
        }

        return $path;
    }

    private function storeLegacyDataUrl(string $dataUrl, string $mimeType): string
    {
        $prefix = 'data:'.$mimeType.';base64,';
        $encoded = str_starts_with(strtolower($dataUrl), $prefix)
            ? substr($dataUrl, strlen($prefix))
            : '';
        $bytes = $encoded === '' ? false : base64_decode($encoded, true);

        if ($bytes === false || strlen($bytes) > self::MAX_BYTES) {
            throw ValidationException::withMessages(['answers' => ['بيانات المرفق غير صالحة أو تتجاوز 5 ميجابايت.']]);
        }

        $extension = $this->extensionForMime($mimeType);
        $path = self::DIRECTORY.'/'.str()->uuid().'.'.$extension;

        if (! Storage::disk($this->disk())->put($path, $bytes)) {
            throw ValidationException::withMessages(['answers' => ['تعذر حفظ المرفق المرفوع.']]);
        }

        return $path;
    }

    private function disk(): string
    {
        return (string) config('filesystems.assessment_disk', 'local');
    }

    private function extensionForMime(string $mimeType): string
    {
        return match ($mimeType) {
            'application/pdf' => 'pdf',
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            'video/mp4' => 'mp4',
            'video/webm' => 'webm',
            'video/quicktime' => 'mov',
            default => 'bin',
        };
    }
}
