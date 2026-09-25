<?php

namespace App\Http\Requests\CoreData;

use App\Http\Requests\DashboardFormRequest;
use App\Support\Security\PasswordPolicy;

class StoreReciterRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'currentLoginCode' => ['nullable', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'loginCode' => ['required', 'string', 'min:4', 'max:255', 'regex:/^[\pL\pN]+$/u'],
            'password' => ['nullable', 'string', PasswordPolicy::rule(), 'max:255', 'same:passwordConfirmation'],
            'passwordConfirmation' => ['required_with:password', 'string', 'max:255'],
            'branchId' => ['required', 'string', 'max:100'],
            'linkedStudentIds' => ['sometimes', 'array'],
            'linkedStudentIds.*' => ['string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'أدخل اسم المقرئ.',
            'name.string' => 'اسم المقرئ غير صالح.',
            'name.max' => 'اسم المقرئ طويل جدًا.',
            'loginCode.required' => 'أدخل رقم الدخول.',
            'loginCode.string' => 'رقم الدخول غير صالح.',
            'loginCode.min' => 'يجب ألا يقل رقم الدخول عن 4 أحرف أو أرقام.',
            'loginCode.max' => 'رقم الدخول طويل جدًا.',
            'loginCode.regex' => 'رقم الدخول يقبل الحروف والأرقام فقط.',
            'password.string' => 'كلمة المرور غير صالحة.',
            'password.max' => 'كلمة المرور طويلة جدًا.',
            'password.same' => 'تأكيد كلمة المرور غير مطابق.',
            'passwordConfirmation.required_with' => 'أعد كتابة كلمة المرور للتأكيد.',
            'branchId.required' => 'اختر الفرع.',
        ];
    }
}
