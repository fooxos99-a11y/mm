<?php

namespace App\Http\Requests\Registration;

use App\Http\Requests\DashboardFormRequest;
use App\Support\Security\PasswordPolicy;

class AcceptRegistrationRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'loginCode' => ['required', 'string', 'min:1', 'max:255'],
            'password' => ['required', 'string', PasswordPolicy::rule(), 'max:255'],
            'branchId' => ['required', 'in:male,female'],
            'phone' => ['required', 'digits:10'],
            'gender' => ['required', 'in:male,female'],
            'answers' => ['nullable', 'array'],
            'answers.*' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
