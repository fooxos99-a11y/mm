<?php

namespace App\Http\Requests\Assessment;

use App\Http\Requests\Assessment\Concerns\HasAnswerRules;
use App\Http\Requests\AuthenticatedFormRequest;
use Illuminate\Validation\Validator;

class SubmitAssessmentRequest extends AuthenticatedFormRequest
{
    use HasAnswerRules;

    public function rules(): array
    {
        return [
            'courseId' => ['required', 'string', 'max:100'],
            'assessmentType' => ['required', 'string', 'in:pre,post,tasks'],
            'studentName' => ['required', 'string', 'max:255'],
            'loginId' => ['required', 'string', 'max:255'],
            ...$this->answerRules('answers'),
        ];
    }

    public function after(): array
    {
        return [fn (Validator $validator) => $this->validateAnswerFilePayloads(
            $validator,
            (array) $this->input('answers', []),
        )];
    }
}
