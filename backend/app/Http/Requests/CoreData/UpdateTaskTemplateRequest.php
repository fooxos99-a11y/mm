<?php

namespace App\Http\Requests\CoreData;

use App\Http\Requests\DashboardFormRequest;

class UpdateTaskTemplateRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string'],
            'content' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
