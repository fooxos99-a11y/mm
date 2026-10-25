<?php

namespace App\Http\Requests\CoreData\Concerns;

use Illuminate\Support\Arr;
use Symfony\Component\HttpFoundation\File\UploadedFile;

trait HasTrainingMaterialRules
{
    private const TRAINING_ATTACHMENT_MIME_TYPES = [
        'application/pdf',
        'application/zip',
        'application/x-zip-compressed',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'audio/mpeg',
        'audio/wav',
    ];

    /**
     * @return array<string, list<string>>
     */
    protected function trainingMaterialRules(bool $allowExistingAttachments): array
    {
        $mimeRule = 'mimetypes:'.implode(',', self::TRAINING_ATTACHMENT_MIME_TYPES);

        return [
            'title' => ['required', 'string'],
            'description' => ['nullable', 'string'],
            'branchId' => ['nullable', 'string'],
            'attachments' => ['sometimes', 'array', 'min:1'],
            'attachments.*.id' => $allowExistingAttachments ? ['sometimes', 'string'] : ['prohibited'],
            'attachments.*.label' => ['nullable', 'string'],
            'attachments.*.url' => ['nullable', 'url', 'max:2048'],
            'attachments.*.file' => ['nullable', 'file', $mimeRule, 'max:102400'],
            'files' => ['sometimes', 'array', 'min:1'],
            'files.*' => ['file', $mimeRule, 'max:102400'],
        ];
    }

    public function messages(): array
    {
        $messages = [
            'title.required' => 'أدخل عنوان المادة التدريبية.',
            'attachments.*.file.max' => 'حجم الملف يتجاوز 100 ميجابايت. اختر ملفًا أصغر.',
            'files.*.max' => 'حجم الملف يتجاوز 100 ميجابايت. اختر ملفًا أصغر.',
            'attachments.*.file.mimetypes' => 'نوع الملف غير مدعوم. اختر ملفًا بإحدى الصيغ المسموحة.',
            'files.*.mimetypes' => 'نوع الملف غير مدعوم. اختر ملفًا بإحدى الصيغ المسموحة.',
            'attachments.*.file.file' => 'المرفق ليس ملفًا صالحًا. اختر الملف مرة أخرى.',
            'files.*.file' => 'المرفق ليس ملفًا صالحًا. اختر الملف مرة أخرى.',
            'attachments.*.url.url' => 'رابط المرفق غير صحيح. تحقق من الرابط.',
        ];

        foreach (Arr::dot($this->allFiles()) as $key => $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $messages[$key.'.uploaded'] = match ($file->getError()) {
                UPLOAD_ERR_INI_SIZE => 'حجم الملف يتجاوز حد الرفع المضبوط في الخادم. تواصل مع الدعم لتعديل الحد.',
                UPLOAD_ERR_FORM_SIZE => 'حجم الملف يتجاوز الحد المسموح في نموذج الرفع.',
                UPLOAD_ERR_PARTIAL => 'لم يصل الملف كاملًا إلى الخادم. أعد رفعه.',
                UPLOAD_ERR_NO_FILE => 'لم يصل ملف إلى الخادم. اختر الملف مرة أخرى.',
                UPLOAD_ERR_NO_TMP_DIR => 'تعذر استقبال الملف بسبب مشكلة في مجلد التخزين المؤقت بالخادم. تواصل مع الدعم.',
                UPLOAD_ERR_CANT_WRITE => 'تعذر كتابة الملف على الخادم. تواصل مع الدعم.',
                UPLOAD_ERR_EXTENSION => 'أوقفت إحدى إضافات الخادم استقبال الملف. تواصل مع الدعم.',
                default => 'فشل استقبال الملف، ولم يحدد الخادم السبب. أعد المحاولة أو تواصل مع الدعم.',
            };
        }

        return $messages;
    }
}
