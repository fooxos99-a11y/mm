<?php

namespace App\Http\Requests\Assessment;

use App\Http\Requests\Assessment\Concerns\HasAnswerRules;
use App\Http\Requests\DashboardFormRequest;
use Illuminate\Validation\Validator;

class BulkImportAssessmentsRequest extends DashboardFormRequest
{
    use HasAnswerRules;

    public function rules(): array
    {
        return [
            'courseId' => ['required', 'string', 'max:100'],
            'assessmentType' => ['required', 'string', 'in:pre,post,tasks'],
            'submissions' => ['required', 'array', 'max:1000'],
            'submissions.*.studentName' => ['required', 'string', 'max:255'],
            'submissions.*.loginId' => ['required', 'string', 'max:255'],
            'submissions.*.manualScore' => ['nullable', 'numeric'],
            ...$this->answerRules('submissions.*.answers'),
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach ((array) $this->input('submissions', []) as $index => $submission) {
                $answers = is_array($submission) ? (array) ($submission['answers'] ?? []) : [];
                $this->validateAnswerFilePayloads($validator, $answers, "submissions.$index.answers");
            }
        }];
    }
}
