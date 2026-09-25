<?php

namespace App\Http\Requests\CoreData;

use App\Http\Requests\AuthenticatedFormRequest;

class ToggleStudentPartRequest extends AuthenticatedFormRequest
{
    public function rules(): array
    {
        return [
            'reciterId' => ['nullable', 'string', 'max:100'],
            'shouldMarkComplete' => ['required', 'boolean'],
        ];
    }
}
