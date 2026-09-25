<?php

namespace App\Http\Requests\Assessment\Concerns;

trait HasFinalQuestionRules
{
    /**
     * @return array<string, list<string>>
     */
    protected function finalQuestionRules(): array
    {
        return [
            'prompt' => ['required', 'string'],
            'type' => ['required', 'string'],
            'options' => ['sometimes', 'array'],
            'options.*' => ['string'],
            'allowFile' => ['required', 'boolean'],
            'points' => ['required', 'integer'],
            'correctAnswer' => ['required_unless:type,text', 'nullable', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'prompt.required' => 'اكتب نص السؤال.',
            'type.required' => 'اختر نوع السؤال.',
            'allowFile.required' => 'حدد ما إذا كان السؤال يقبل ملفًا.',
            'points.required' => 'أدخل درجة السؤال.',
            'points.integer' => 'درجة السؤال يجب أن تكون رقمًا صحيحًا.',
            'correctAnswer.required_unless' => 'حدد الإجابة الصحيحة.',
        ];
    }
}
