<?php

namespace App\Http\Requests\Archive;

use App\Http\Requests\DashboardFormRequest;

class AssignArchivedStudentRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return ['name' => ['required', 'string', 'max:255']];
    }
}
