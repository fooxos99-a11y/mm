<?php

namespace App\Http\Requests\Archive;

use App\Http\Requests\DashboardFormRequest;

class ArchiveAllRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'unique:archives,name'],
            'batch_type' => ['nullable', 'in:male,female,all'],
        ];
    }
}
