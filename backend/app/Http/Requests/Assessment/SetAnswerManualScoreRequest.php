<?php

namespace App\Http\Requests\Assessment;

use App\Http\Requests\DashboardFormRequest;

class SetAnswerManualScoreRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return ['score' => ['nullable', 'numeric', 'min:0']];
    }

    public function messages(): array
    {
        return [
            'score.numeric' => 'أدخل درجة صحيحة.',
            'score.min' => 'لا يمكن أن تكون الدرجة أقل من صفر.',
        ];
    }
}
