<?php

namespace App\Http\Requests\CoreData;

use App\Http\Requests\DashboardFormRequest;
use Illuminate\Validation\Rules\Password;

class StoreDashboardAccountRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:6', 'max:255'],
            'loginCode' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', Password::min(8)->max(255)],
            'role' => ['required', 'string', 'in:admin,male_manager,female_manager'],
        ];
    }
}
