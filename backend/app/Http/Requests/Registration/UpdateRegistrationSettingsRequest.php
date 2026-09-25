<?php

namespace App\Http\Requests\Registration;

use App\Http\Requests\DashboardFormRequest;

class UpdateRegistrationSettingsRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return ['isOpen' => ['required', 'boolean']];
    }
}
