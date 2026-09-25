<?php

namespace App\Http\Requests\Assessment;

use App\Http\Requests\DashboardFormRequest;

class StoreSatisfactionQuestionRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'prompt' => ['required', 'string'],
            'type' => ['required', 'string'],
            'isRequired' => ['required', 'boolean'],
            'targetScope' => ['sometimes', 'nullable', 'string', 'in:all,course'],
            'courseId' => ['nullable', 'string'],
        ];
    }
}
