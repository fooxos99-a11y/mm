<?php

namespace App\Http\Requests\CoreData;

use App\Http\Requests\DashboardFormRequest;

class UpdatePractitionerPageContentRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return ['content' => ['required', 'array']];
    }
}
