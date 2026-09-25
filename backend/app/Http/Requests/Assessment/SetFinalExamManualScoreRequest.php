<?php

namespace App\Http\Requests\Assessment;

use App\Http\Requests\DashboardFormRequest;

class SetFinalExamManualScoreRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return ['score' => ['nullable', 'numeric']];
    }
}
