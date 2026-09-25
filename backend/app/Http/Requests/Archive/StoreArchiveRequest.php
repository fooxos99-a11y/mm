<?php

namespace App\Http\Requests\Archive;

use App\Http\Requests\DashboardFormRequest;

class StoreArchiveRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'unique:archives'],
            'courses_count' => ['required', 'integer', 'min:0', 'max:1000000'],
            'batch_type' => ['required', 'in:male,female,all'],
        ];
    }
}
