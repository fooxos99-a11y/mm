<?php

namespace App\Http\Requests\Assessment;

use App\Http\Requests\DashboardFormRequest;

class UpdateFinalExamSettingRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'isEnabled' => ['required', 'boolean'],
            'closesAt' => ['nullable', 'string'],
            'notificationTemplate' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
