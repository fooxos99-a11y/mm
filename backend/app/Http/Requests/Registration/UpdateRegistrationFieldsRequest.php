<?php

namespace App\Http\Requests\Registration;

use App\Http\Requests\DashboardFormRequest;

class UpdateRegistrationFieldsRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'fields' => ['present', 'array'],
            'fields.*.id' => ['nullable', 'string', 'max:100'],
            'fields.*.label' => ['required', 'string', 'max:255'],
            'fields.*.type' => ['required', 'in:text,number,select'],
            'fields.*.required' => ['nullable', 'boolean'],
            'fields.*.showInRequests' => ['nullable', 'boolean'],
            'fields.*.options' => ['nullable', 'array'],
            'fields.*.options.*' => ['nullable', 'string', 'max:255'],
            'fixedLabels' => ['nullable', 'array:name,gender,phone'],
            'fixedLabels.name' => ['nullable', 'string', 'max:255'],
            'fixedLabels.gender' => ['nullable', 'string', 'max:255'],
            'fixedLabels.phone' => ['nullable', 'string', 'max:255'],
        ];
    }
}
