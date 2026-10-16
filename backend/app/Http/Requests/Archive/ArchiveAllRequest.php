<?php

namespace App\Http\Requests\Archive;

use App\Http\Requests\DashboardFormRequest;
use App\Support\DepartmentContext;
use Illuminate\Validation\Rule;

class ArchiveAllRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('archives', 'name')->where('department_id', DepartmentContext::id())],
            'batch_type' => ['nullable', 'in:male,female,all'],
        ];
    }
}
