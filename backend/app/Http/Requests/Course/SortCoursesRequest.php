<?php

namespace App\Http\Requests\Course;

use App\Http\Requests\DashboardFormRequest;

class SortCoursesRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'orderedIds' => ['required', 'array'],
            'orderedIds.*' => ['string'],
        ];
    }
}
