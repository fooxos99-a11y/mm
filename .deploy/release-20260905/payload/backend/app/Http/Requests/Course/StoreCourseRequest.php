<?php

namespace App\Http\Requests\Course;

use App\Http\Requests\DashboardFormRequest;
use Illuminate\Validation\Rule;

class StoreCourseRequest extends DashboardFormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'isActive' => ['sometimes', 'boolean'],
            'entityType' => ['nullable', Rule::in(['course', 'task'])],
            'taskMode' => ['nullable', Rule::in(['questions', 'document'])],
            'taskTemplateId' => ['nullable', 'string', 'max:255'],
            'taskTemplateName' => ['nullable', 'string', 'max:255'],
            'taskTemplateContent' => ['nullable', 'string', 'max:1000000'],
            'youtubeUrl' => ['nullable', 'url:http,https', 'max:2048'],
            'taskDescription' => ['nullable', 'string', 'max:10000'],
            'taskPoints' => ['sometimes', 'integer', 'min:0', 'max:10000'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->exists('taskTemplateContent')) {
            return;
        }

        $value = $this->input('taskTemplateContent');
        if ($value === null || is_string($value)) {
            return;
        }

        $this->merge([
            'taskTemplateContent' => is_scalar($value)
                ? (string) $value
                : (json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: ''),
        ]);
    }
}
