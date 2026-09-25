<?php

namespace App\Http\Requests\Assessment;

use App\Http\Requests\AuthenticatedFormRequest;

class StoreSatisfactionResponsesRequest extends AuthenticatedFormRequest
{
    public function rules(): array
    {
        return [
            'responses' => ['required', 'array'],
            'responses.*.courseId' => ['required', 'string'],
            'responses.*.questionId' => ['required', 'string'],
            'responses.*.loginCode' => ['required', 'string'],
            'responses.*.studentName' => ['required', 'string'],
            'responses.*.ratingValue' => ['nullable', 'integer'],
            'responses.*.textValue' => ['nullable', 'string'],
        ];
    }
}
