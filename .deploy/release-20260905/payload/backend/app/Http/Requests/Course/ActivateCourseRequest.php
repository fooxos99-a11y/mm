<?php

namespace App\Http\Requests\Course;

use App\Http\Requests\DashboardFormRequest;

class ActivateCourseRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'pre' => ['sometimes', 'boolean'],
            'post' => ['sometimes', 'boolean'],
            'tasks' => ['sometimes', 'boolean'],
        ];
    }
}
