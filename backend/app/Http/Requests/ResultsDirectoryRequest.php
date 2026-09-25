<?php

namespace App\Http\Requests;

class ResultsDirectoryRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return ['branchCode' => ['required', 'in:male,female'],
            'assessmentType' => ['required', 'in:attendance,pre,post,tasks,final'],
            'courseId' => ['nullable', 'required_unless:assessmentType,final', 'uuid'],
            'state' => ['sometimes', 'in:all,present,absent,absent3plus'],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1', 'max:100000'],
            'perPage' => ['sometimes', 'integer', 'min:1', 'max:100']];
    }
}
