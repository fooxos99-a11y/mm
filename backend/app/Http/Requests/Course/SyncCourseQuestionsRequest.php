<?php

namespace App\Http\Requests\Course;

use App\Http\Requests\DashboardFormRequest;
use Illuminate\Validation\Rule;

class SyncCourseQuestionsRequest extends DashboardFormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'assessmentType' => ['required', Rule::in(['pre', 'post', 'tasks'])],
            'questions' => ['present', 'array', 'max:200'],
            'questions.*.id' => ['nullable', 'uuid'],
            'questions.*.prompt' => ['required', 'string', 'max:5000'],
            'questions.*.type' => ['required', Rule::in(['multiple', 'text', 'truefalse'])],
            'questions.*.options' => ['sometimes', 'array', 'max:50'],
            'questions.*.options.*' => ['string', 'max:2000'],
            'questions.*.allowFile' => ['required', 'boolean'],
            'questions.*.points' => ['required', 'integer', 'min:0', 'max:10000'],
            'questions.*.correctAnswer' => ['nullable', 'string', 'max:2000'],
            'questions.*.attachmentName' => ['nullable', 'string', 'max:255'],
            'questions.*.attachmentType' => ['nullable', 'string', 'max:100'],
            'questions.*.attachmentDataUrl' => ['nullable', 'string', 'max:7100000'],
            'deletedQuestionIds' => ['sometimes', 'array', 'max:200'],
            'deletedQuestionIds.*' => ['uuid'],
            'courseUpdates' => ['sometimes', 'array'],
            'courseUpdates.youtubeUrl' => ['sometimes', 'nullable', 'url:http,https', 'max:2048'],
            'courseUpdates.taskDescription' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'courseUpdates.taskMode' => ['sometimes', Rule::in(['questions', 'document'])],
            'courseUpdates.taskTemplateContent' => ['sometimes', 'nullable', 'string', 'max:1000000'],
        ];
    }
}
