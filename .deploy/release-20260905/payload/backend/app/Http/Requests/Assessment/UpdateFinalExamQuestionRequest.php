<?php

namespace App\Http\Requests\Assessment;

use App\Http\Requests\Assessment\Concerns\HasFinalQuestionRules;
use App\Http\Requests\DashboardFormRequest;

class UpdateFinalExamQuestionRequest extends DashboardFormRequest
{
    use HasFinalQuestionRules;

    public function rules(): array
    {
        return $this->finalQuestionRules();
    }
}
