<?php

namespace App\Http\Requests\Completion;

use App\Http\Requests\DashboardFormRequest;

class UpdateCompletionRequirementsRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'attendanceRequired' => ['required', 'integer', 'min:1', 'max:1000'],
            'tasksPercentageRequired' => ['required', 'integer', 'min:1', 'max:100'],
            'finalExamPercentageRequired' => ['required', 'integer', 'min:1', 'max:100'],
            'quranPartsRequired' => ['required', 'integer', 'min:1', 'max:30'],
        ];
    }
}
