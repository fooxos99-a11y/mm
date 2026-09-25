<?php

namespace App\Http\Requests\CoreData;

use App\Http\Requests\DashboardFormRequest;

class SetRolePermissionRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'role' => ['required', 'string', 'in:male_manager,female_manager'],
            'key' => ['required', 'string', 'max:100'],
            'isEnabled' => ['required', 'boolean'],
        ];
    }
}
