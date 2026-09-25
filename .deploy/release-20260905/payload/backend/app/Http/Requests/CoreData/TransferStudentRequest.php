<?php

namespace App\Http\Requests\CoreData;

use App\Http\Requests\DashboardFormRequest;

class TransferStudentRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'studentId' => ['required', 'string', 'max:100'],
            'targetReciterId' => ['required', 'string', 'max:100'],
        ];
    }
}
