<?php

namespace App\Http\Requests\CoreData;

use App\Http\Requests\DashboardFormRequest;

class StoreTaskTemplateRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string'],
            'content' => ['nullable', 'string'],
        ];
    }
}
