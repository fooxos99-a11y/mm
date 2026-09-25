<?php

namespace App\Http\Requests\Assessment;

use App\Http\Requests\Assessment\Concerns\HasAnswerRules;
use App\Http\Requests\AuthenticatedFormRequest;
use Illuminate\Validation\Validator;

class SubmitFinalExamRequest extends AuthenticatedFormRequest
{
    use HasAnswerRules;

    public function rules(): array
    {
        return [
            'branchCode' => ['required', 'string', 'in:male,female'],
            'studentName' => ['required', 'string', 'max:255'],
            'loginCode' => ['required', 'string', 'max:255'],
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
