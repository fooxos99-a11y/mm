<?php

namespace App\Services;

use Illuminate\Database\Query\Builder;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

class StudentAssessmentAnswerValidator
{
    public function validate(Builder $query, array $answers): void
    {
        $questions = $query->whereNull('archive_id')->whereNull('deleted_at')
            ->get(['id', 'question_type', 'options', 'allow_file'])->keyBy('id');
        $ids = collect($answers)->pluck('questionId')->map(fn ($id) => trim((string) $id));
        if ($questions->isEmpty() || $ids->count() !== $questions->count()
            || $ids->unique()->count() !== $ids->count()
            || $ids->diff($questions->keys())->isNotEmpty()) {
            $this->reject('أجب على جميع أسئلة التقييم الحالي قبل الإرسال.');
        }
        foreach ($answers as $answer) {
            $question = $questions->get(trim((string) $answer['questionId']));
            $value = (string) ($answer['value'] ?? '');
            $hasFile = ($answer['file'] ?? null) instanceof UploadedFile
                || trim((string) ($answer['fileDataUrl'] ?? '')) !== '';
            if ($hasFile && ! $question->allow_file) {
                $this->reject('هذا السؤال لا يسمح بإرفاق ملف.');
            }
            if ($question->question_type === 'text') {
                if (trim($value) === '' && ! $hasFile) {
                    $this->reject('أكمل الإجابة النصية أو أرفق الملف المسموح.');
                }
            } elseif (! in_array($value, json_decode($question->options, true) ?: [], true)) {
                $this->reject('اختر إجابة من الخيارات المحفوظة للسؤال.');
            }
        }
    }

    private function reject(string $message): never
    {
        throw ValidationException::withMessages(['answers' => $message]);
    }
}
