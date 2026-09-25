<?php

namespace App\Http\Requests\CoreData;

use App\Http\Requests\DashboardFormRequest;

class UpdateHomePageContentRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return ['content' => ['required', 'array']];
    }
}
