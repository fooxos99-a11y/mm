<?php

namespace App\Http\Requests\Registration;

use App\Http\Requests\DashboardFormRequest;

class RejectRegistrationRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return ['reason' => ['nullable', 'string']];
    }
}
