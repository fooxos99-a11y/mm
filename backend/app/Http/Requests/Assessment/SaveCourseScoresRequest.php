<?php

namespace App\Http\Requests\Assessment;

use App\Http\Requests\DashboardFormRequest;

class SaveCourseScoresRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'courseId' => ['required', 'uuid'],
            'assessmentType' => ['required', 'in:pre,post'],
            'branchCode' => ['required', 'in:male,female'],
            'totalPoints' => ['required', 'numeric', 'decimal:0,2', 'gt:0', 'max:1000000'],
            'grades' => ['required', 'array', 'min:1', 'max:10000'],
            'grades.*.studentId' => ['required', 'uuid', 'distinct'],
            'grades.*.score' => ['present', 'nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:1000000'],
            'grades.*.expectedVersion' => ['present', 'nullable', 'uuid'],
        ];
    }

    public function messages(): array
    {
        return [
            'totalPoints.*' => 'أدخل درجة الاختبار.',
            'grades.*.score.numeric' => 'أدخل درجة رقمية.',
            'grades.*.score.decimal' => 'استخدم منزلتين عشريتين كحد أقصى.',
            'grades.*.score.min' => 'لا يمكن أن تكون الدرجة أقل من صفر.',
            'grades.*.score.max' => 'الدرجة أكبر من الحد المسموح.',
            'grades.*.studentId.distinct' => 'لا يمكن تكرار الطالب في الدفعة نفسها.',
        ];
    }
}
