<?php

namespace App\Http\Requests\CoreData;

use App\Http\Requests\DashboardFormRequest;
use App\Support\Security\PasswordPolicy;

class StoreReciterRequest extends DashboardFormRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('phone'))) {
            $phone = strtr($this->input('phone'), array_combine(
                preg_split('//u', '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', -1, PREG_SPLIT_NO_EMPTY),
                str_split('01234567890123456789'),
            ));
            $phone = preg_replace('/[\s-]+/u', '', $phone);
            $this->merge(['phone' => $phone === '' ? null : $phone]);
        }
    }

    public function rules(): array
    {
        return [
            'currentLoginCode' => ['nullable', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20', 'regex:/^(?:05[0-9]{8}|\+[1-9][0-9]{7,14})$/'],
            'loginCode' => ['required', 'string', 'max:255'],
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
            'phone.string' => 'أدخل رقم جوال صحيحًا.',
            'phone.max' => 'رقم الجوال طويل جدًا.',
            'phone.regex' => 'أدخل رقم جوال صحيحًا يبدأ بـ 05 أو بمفتاح الدولة مثل +966.',
            'name.string' => 'اسم المقرئ غير صالح.',
            'name.max' => 'اسم المقرئ طويل جدًا.',
            'loginCode.required' => 'أدخل رقم الدخول.',
            'loginCode.string' => 'رقم الدخول غير صالح.',
            'loginCode.min' => 'يجب ألا يقل رقم الدخول عن 4 أحرف أو أرقام.',
            'loginCode.max' => 'رقم الدخول طويل جدًا.',
            'password.string' => 'كلمة المرور غير صالحة.',
            'password.max' => 'كلمة المرور طويلة جدًا.',
            'password.same' => 'تأكيد كلمة المرور غير مطابق.',
            'passwordConfirmation.required_with' => 'أعد كتابة كلمة المرور للتأكيد.',
            'branchId.required' => 'اختر الفرع.',
        ];
    }
}
