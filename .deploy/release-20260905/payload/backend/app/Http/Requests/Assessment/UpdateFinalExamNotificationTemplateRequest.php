<?php

namespace App\Http\Requests\Assessment;

use App\Http\Requests\DashboardFormRequest;

class UpdateFinalExamNotificationTemplateRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return ['notificationTemplate' => ['required', 'string']];
    }
}
