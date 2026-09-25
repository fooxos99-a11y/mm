<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FinalExamSubmissionValidator
{
    public function assertOpen(string $branchCode): void
    {
        $setting = DB::table('final_exam_settings')->where('branch_code', $branchCode)->first();

        if (! $setting || ! (bool) ($setting->is_enabled ?? false)) {
            $this->throwClosed();
        }

        if ($setting->closes_at && ! $this->isOpen((string) $setting->closes_at)) {
            $this->throwClosed();
        }
    }

    public function questionSnapshots(array $answers, string $branchCode): Collection
    {
        $questionIds = collect($answers)
            ->pluck('questionId')
            ->map(fn ($questionId): string => trim((string) $questionId))
            ->reject(fn (string $questionId): bool => $questionId === '__score_override__')
            ->values();

        if ($questionIds->contains('')) {
            throw ValidationException::withMessages([
                'answers' => ['كل إجابة يجب أن ترتبط بسؤال في الاختبار النهائي.'],
            ]);
        }

        if ($questionIds->count() !== $questionIds->unique()->count()) {
            throw ValidationException::withMessages([
                'answers' => ['لا يمكن إرسال أكثر من إجابة للسؤال نفسه.'],
            ]);
        }

        if ($questionIds->isEmpty()) {
            return collect();
        }

        $questions = DB::table('final_exam_questions')
            ->where('branch_code', $branchCode)
            ->whereNull('archive_id')
            ->whereIn('id', $questionIds->all())
            ->get([
                'id',
                'prompt',
                'question_type',
                'options',
                'correct_answer',
                'points',
                'allow_file',
            ])
            ->keyBy('id');

        if ($questions->count() !== $questionIds->count()) {
            throw ValidationException::withMessages([
                'answers' => ['توجد إجابة لا تتبع أسئلة هذا الفرع.'],
            ]);
        }

        return $questions;
    }

    public function snapshotColumns(object $question): array
    {
        return [
            'question_prompt_snapshot' => $question->prompt,
            'question_type_snapshot' => $question->question_type,
            'question_options_snapshot' => $question->options,
            'correct_answer_snapshot' => $question->correct_answer,
            'question_points_snapshot' => $question->points,
            'allow_file_snapshot' => $question->allow_file,
        ];
    }

    private function isOpen(string $closesAt): bool
    {
        try {
            return Carbon::parse($closesAt)->isFuture();
        } catch (\Throwable) {
            return false;
        }
    }

    private function throwClosed(): never
    {
        throw ValidationException::withMessages([
            'branchCode' => ['انتهى وقت الإرسال أو أن الاختبار النهائي غير متاح حاليًا.'],
        ]);
    }
}
