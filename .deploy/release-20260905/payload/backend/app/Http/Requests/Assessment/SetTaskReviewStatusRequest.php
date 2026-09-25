<?php

namespace App\Http\Requests\Assessment;

use App\Http\Requests\DashboardFormRequest;

class SetTaskReviewStatusRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return ['status' => ['required', 'in:approved,rejected']];
    }
}
