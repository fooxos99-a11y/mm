<?php

namespace App\Http\Requests;

class DashboardDatasetRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'perPage' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'courseId' => ['sometimes', 'string', 'max:100'],
            'assessmentType' => ['sometimes', 'string', 'in:pre,post,tasks'],
            'loginCode' => ['sometimes', 'string', 'max:255'],
            'branchCode' => ['sometimes', 'string', 'in:male,female'],
        ];
    }
}
