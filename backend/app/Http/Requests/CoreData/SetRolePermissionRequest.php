<?php

namespace App\Http\Requests\CoreData;

use App\Http\Requests\DashboardFormRequest;
use App\Support\Security\PermissionCatalog;
use Illuminate\Validation\Rule;

class SetRolePermissionRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'role' => ['required', 'string', 'in:male_manager,female_manager'],
            'key' => ['required', 'string', Rule::in(array_keys(PermissionCatalog::entries()))],
            'isEnabled' => ['required', 'boolean'],
        ];
    }
}
