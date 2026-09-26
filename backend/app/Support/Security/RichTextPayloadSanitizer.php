<?php

namespace App\Support\Security;

final class RichTextPayloadSanitizer
{
    /** @var array<string, true> */
    private const RICH_TEXT_KEYS = [
        'answer' => true,
        'answerText' => true,
        'content' => true,
        'description' => true,
        'prompt' => true,
        'taskDescription' => true,
        'taskTemplateContent' => true,
        'value' => true,
    ];

    public function __construct(private readonly RichTextSanitizer $sanitizer)
    {
    }

    public function sanitize(array $payload): array
    {
        foreach ($payload as $key => $value) {
            if (is_array($value)) {
                $payload[$key] = $this->sanitize($value);
            } elseif (is_string($value) && isset(self::RICH_TEXT_KEYS[(string) $key])) {
                $payload[$key] = $this->sanitizer->sanitize($value);
            }
        }

        return $payload;
    }
}
