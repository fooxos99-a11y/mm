<?php

namespace App\Services\Concerns;

trait MapsQuestionTypes
{
    private function mapQuestionType(?string $questionType, mixed $options): string
    {
        if ($questionType === 'text') {
            return 'text';
        }

        $normalizedOptions = array_map(
            static fn ($option) => mb_strtolower(trim((string) $option)),
            $this->decodeJsonArray($options),
        );

        return count($normalizedOptions) === 2
            && in_array('صح', $normalizedOptions, true)
            && in_array('خطأ', $normalizedOptions, true) ? 'truefalse' : 'multiple';
    }
}
