<?php

namespace App\Http\Requests\Assessment\Concerns;

use Illuminate\Validation\Validator;

trait HasAnswerRules
{
    private const MAX_ANSWER_DATA_URL_LENGTH = 7_100_000;

    private const ANSWER_ATTACHMENT_MIME_TYPES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/quicktime',
    ];

    /**
     * @return array<string, list<string>>
     */
    protected function answerRules(string $root): array
    {
        return [
            $root => ['required', 'array', 'max:500'],
            "$root.*.questionId" => ['required', 'string', 'max:100'],
            "$root.*.value" => ['nullable', 'string', 'max:20000'],
            "$root.*.fileName" => ['nullable', 'string', 'max:255'],
            "$root.*.fileType" => ['nullable', 'string', 'max:100'],
            "$root.*.fileDataUrl" => ['nullable', 'string', 'max:'.self::MAX_ANSWER_DATA_URL_LENGTH],
            "$root.*.file" => [
                'nullable',
                'file',
                'mimetypes:'.implode(',', self::ANSWER_ATTACHMENT_MIME_TYPES),
                'max:5120',
            ],
            "$root.*.files" => ['prohibited'],
        ];
    }

    protected function validateAnswerFilePayloads(Validator $validator, array $answers, string $root = 'answers'): void
    {
        foreach ($answers as $index => $answer) {
            if (! is_array($answer)) {
                continue;
            }

            $fileDataUrl = trim((string) ($answer['fileDataUrl'] ?? ''));
            if ($fileDataUrl === '') {
                continue;
            }

            $fileType = strtolower(trim((string) ($answer['fileType'] ?? '')));
            $field = "$root.$index.fileDataUrl";

            if (! in_array($fileType, self::ANSWER_ATTACHMENT_MIME_TYPES, true)) {
                $validator->errors()->add($field, 'نوع المرفق غير مسموح.');

                continue;
            }

            if (strlen($fileDataUrl) > self::MAX_ANSWER_DATA_URL_LENGTH) {
                $validator->errors()->add($field, 'حجم المرفق أكبر من الحد المسموح.');

                continue;
            }

            $expectedPrefix = 'data:'.$fileType.';base64,';
            if (! str_starts_with(strtolower($fileDataUrl), $expectedPrefix)) {
                $validator->errors()->add($field, 'صيغة المرفق غير صالحة.');

                continue;
            }

            $payload = substr($fileDataUrl, strlen($expectedPrefix));
            if ($payload === '' || ! preg_match('/^[A-Za-z0-9+\/=\r\n]+$/', $payload) || base64_decode($payload, true) === false) {
                $validator->errors()->add($field, 'بيانات المرفق غير صالحة.');
            }
        }
    }
}
