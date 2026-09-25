<?php

namespace App\Http\Requests\Assessment;

use App\Http\Requests\Assessment\Concerns\HasFinalQuestionRules;
use App\Http\Requests\DashboardFormRequest;

class StoreFinalExamQuestionRequest extends DashboardFormRequest
{
    use HasFinalQuestionRules;

    public function rules(): array
    {
        return [
            'branchCode' => ['required', 'string'],
            ...$this->finalQuestionRules(),
        ];
    }
}
