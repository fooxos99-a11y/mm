<?php

namespace App\Http\Requests\CoreData;

use App\Http\Requests\DashboardFormRequest;
use App\Support\Security\PasswordPolicy;

class UpdateStudentRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'loginCode' => ['sometimes', 'required', 'string', 'min:4', 'max:255', 'regex:/^[\pL\pN]+$/u'],
            'password' => ['nullable', 'string', PasswordPolicy::rule(), 'max:255', 'same:passwordConfirmation'],
            'passwordConfirmation' => ['nullable', 'required_with:password', 'string', 'max:255'],
            'branchId' => ['sometimes', 'string', 'max:100'],
            'note' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'isCertified' => ['sometimes', 'boolean'],
            'completedParts' => ['sometimes', 'array'],
            'completedParts.*' => ['integer', 'min:1', 'max:30'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'أدخل اسم المعلم/ة.',
            'name.string' => 'اسم المعلم/ة غير صالح.',
            'name.max' => 'اسم المعلم/ة طويل جدًا.',
            'loginCode.required' => 'أدخل رقم الدخول.',
            'loginCode.string' => 'رقم الدخول غير صالح.',
            'loginCode.min' => 'يجب ألا يقل رقم الدخول عن 4 أحرف أو أرقام.',
            'loginCode.max' => 'رقم الدخول طويل جدًا.',
            'loginCode.regex' => 'رقم الدخول يقبل الحروف والأرقام فقط.',
            'password.string' => 'كلمة المرور غير صالحة.',
            'password.max' => 'كلمة المرور طويلة جدًا.',
            'password.same' => 'تأكيد كلمة المرور غير مطابق.',
            'passwordConfirmation.required_with' => 'أعد كتابة كلمة المرور للتأكيد.',
        ];
    }
}
