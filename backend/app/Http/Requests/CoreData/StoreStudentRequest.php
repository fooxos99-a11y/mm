<?php

namespace App\Http\Requests\CoreData;

use App\Http\Requests\DashboardFormRequest;
use App\Support\Security\PasswordPolicy;

class StoreStudentRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'loginId' => ['required', 'string', 'min:4', 'max:255', 'regex:/^[\pL\pN]+$/u'],
            'password' => ['nullable', 'string', PasswordPolicy::rule(), 'max:255', 'same:passwordConfirmation'],
            'passwordConfirmation' => ['nullable', 'required_with:password', 'string', 'max:255'],
            'branchId' => ['required', 'string', 'max:100'],
            'note' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'أدخل اسم المعلم/ة.',
            'name.string' => 'اسم المعلم/ة غير صالح.',
            'name.max' => 'اسم المعلم/ة طويل جدًا.',
            'loginId.required' => 'أدخل رقم الدخول.',
            'loginId.string' => 'رقم الدخول غير صالح.',
            'loginId.min' => 'يجب ألا يقل رقم الدخول عن 4 أحرف أو أرقام.',
            'loginId.max' => 'رقم الدخول طويل جدًا.',
            'loginId.regex' => 'رقم الدخول يقبل الحروف والأرقام فقط.',
            'password.string' => 'كلمة المرور غير صالحة.',
            'password.max' => 'كلمة المرور طويلة جدًا.',
            'password.same' => 'تأكيد كلمة المرور غير مطابق.',
            'passwordConfirmation.required_with' => 'أعد كتابة كلمة المرور للتأكيد.',
            'branchId.required' => 'اختر الفرع.',
        ];
    }
}
