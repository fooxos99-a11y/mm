<?php

namespace App\Http\Requests\Assessment;

use App\Http\Requests\DashboardFormRequest;

class CopyFinalExamQuestionsRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'from' => ['required', 'string'],
            'to' => ['required', 'string'],
            'move' => ['required', 'boolean'],
        ];
    }
}
