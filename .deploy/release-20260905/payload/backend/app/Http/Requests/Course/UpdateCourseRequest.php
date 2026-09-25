<?php

namespace App\Http\Requests\Course;

use Illuminate\Validation\Rule;

class UpdateCourseRequest extends StoreCourseRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'entityType' => ['sometimes', Rule::in(['course', 'task'])],
            'isActive' => ['sometimes', 'boolean'],
            'isPreEnabled' => ['sometimes', 'boolean'],
            'isPostEnabled' => ['sometimes', 'boolean'],
            'isTasksEnabled' => ['sometimes', 'boolean'],
            'branchAvailability' => ['sometimes', 'array'],
            'assessmentWindows' => ['sometimes', 'array'],
            'assessmentNotificationTemplates' => ['sometimes', 'array'],
            'taskMode' => ['sometimes', 'nullable', Rule::in(['questions', 'document'])],
            'taskTemplateId' => ['sometimes', 'nullable', 'string', 'max:255'],
            'taskTemplateName' => ['sometimes', 'string', 'max:255'],
            'taskTemplateContent' => ['sometimes', 'nullable', 'string', 'max:1000000'],
            'youtubeUrl' => ['sometimes', 'nullable', 'url:http,https', 'max:2048'],
            'taskDescription' => ['sometimes', 'nullable', 'string', 'max:10000'],
        ];
    }
}
