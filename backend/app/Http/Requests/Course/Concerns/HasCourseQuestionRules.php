<?php

namespace App\Http\Requests\Course\Concerns;

use Illuminate\Validation\Rule;

trait HasCourseQuestionRules
{
    /** @return array<string, list<string>> */
    protected function questionRules(): array
    {
        return [
            'prompt' => ['required', 'string', 'max:5000'],
            'type' => ['required', Rule::in(['multiple', 'text', 'truefalse'])],
            'options' => ['sometimes', 'array', 'max:50'],
            'options.*' => ['string', 'max:2000'],
            'allowFile' => ['required', 'boolean'],
            'points' => ['required', 'integer', 'min:0', 'max:10000'],
            'correctAnswer' => ['nullable', 'string', 'max:2000'],
            'attachmentName' => ['nullable', 'string', 'max:255'],
            'attachmentType' => ['nullable', 'string', 'max:100'],
            'attachmentDataUrl' => ['nullable', 'string', 'max:7100000'],
        ];
    }
}
