<?php

namespace App\Http\Requests\Assessment;

use App\Http\Requests\DashboardFormRequest;

class SetManualAttendanceRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'courseId' => ['required', 'string'],
            'branchCode' => ['sometimes', 'string', 'in:male,female'],
            'presentStudents' => ['present', 'array'],
            'presentStudents.*.loginId' => ['required', 'string', 'distinct'],
            'presentStudents.*.studentName' => ['required', 'string'],
            'presentStudents.*.studentId' => ['nullable', 'string'],
        ];
    }
}
