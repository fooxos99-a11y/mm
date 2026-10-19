<?php

namespace App\Http\Requests\CoreData;

use App\Http\Requests\DashboardFormRequest;
use Illuminate\Validation\Rules\Password;

final class UpdateDashboardAccountRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return ['name' => ['required', 'string', 'min:6', 'max:255'],
            'loginCode' => ['required', 'string', 'max:255'],
            'role' => ['required', 'in:admin,male_manager,female_manager'],
            'isActive' => ['required', 'boolean'], 'password' => ['sometimes', 'nullable', 'string', Password::min(8)->max(255)],
            'revision' => ['required', 'string', 'size:64']];
    }
}
