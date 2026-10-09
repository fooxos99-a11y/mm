<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StudentSatisfactionResponseValidator
{
    public function validate(string $loginCode, array $responses): void
    {
        foreach (collect($responses)->groupBy('courseId') as $courseId => $courseResponses) {
            if (! DB::table('course_submissions')->where('course_id', $courseId)
                ->where('assessment_type', 'post')->where('login_code', $loginCode)->whereNull('archive_id')->exists()) {
                $this->reject('يجب إرسال الاختبار البعدي قبل استبيان الرضا.');
            }
            $questions = DB::table('satisfaction_questions')->where('course_id', $courseId)
                ->whereNull('archive_id')->whereNull('deleted_at')->get()->keyBy('id');
            $ids = $courseResponses->pluck('questionId');
            if ($ids->unique()->count() !== $ids->count() || $ids->diff($questions->keys())->isNotEmpty()
                || $questions->where('is_required', true)->keys()->diff($ids)->isNotEmpty()) {
                $this->reject('أجب على جميع أسئلة الرضا الإلزامية دون تكرار السؤال.');
            }
            foreach ($courseResponses as $response) {
                $question = $questions->get($response['questionId']);
                $rating = $response['ratingValue'] ?? null;
                if ($question->type === 'rating') {
                    if (trim((string) ($response['textValue'] ?? '')) !== '') {
                        $this->reject('اختر تقييمًا لسؤال التقييم واكتب نصًا للسؤال النصي.');
                    }
                    if (($question->is_required && $rating === null)
                        || ($rating !== null && ($rating < 1 || $rating > 10))) {
                        $this->reject('اختر تقييمًا من 1 إلى 10 للأسئلة الإلزامية.');
                    }
                } else {
                    if ($rating !== null) {
                        $this->reject('السؤال النصي لا يقبل قيمة تقييم.');
                    }
                    if ($question->is_required && trim((string) ($response['textValue'] ?? '')) === '') {
                        $this->reject('أجب على جميع أسئلة الرضا الإلزامية.');
                    }
                }
            }
        }
    }

    private function reject(string $message): never
    {
        throw ValidationException::withMessages(['responses' => $message]);
    }
}
