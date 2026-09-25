<?php

namespace App\Http\Requests;

class PeopleDirectoryRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'branchCode' => ['sometimes', 'in:male,female'],
            'type' => ['sometimes', 'in:student,reciter'],
            'search' => ['nullable', 'string', 'max:100'],
            'sort' => ['sometimes', 'in:all,highest-progress,lowest-progress'],
            'page' => ['sometimes', 'integer', 'min:1', 'max:100000'],
            'perPage' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
