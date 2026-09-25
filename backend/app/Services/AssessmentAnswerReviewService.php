<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AssessmentAnswerReviewService
{
    public function reviewCourseAnswer(string $submissionId, string $answerId, float|int|null $score, string $reviewerId): void
    {
        $this->review(
            'course_submission_answers',
            'course_submissions',
            'course_questions',
            $submissionId,
            $answerId,
            $score,
            $reviewerId,
        );
    }

    public function reviewFinalAnswer(string $submissionId, string $answerId, float|int|null $score, string $reviewerId): void
    {
        $this->review(
            'final_exam_submission_answers',
            'final_exam_submissions',
            'final_exam_questions',
            $submissionId,
            $answerId,
            $score,
            $reviewerId,
        );
    }

    private function review(
        string $answerTable,
        string $submissionTable,
        string $questionTable,
        string $submissionId,
        string $answerId,
        float|int|null $score,
        string $reviewerId,
    ): void {
        $answer = DB::table($answerTable)
            ->where('id', $answerId)
            ->where('submission_id', $submissionId)
            ->whereNull('archive_id')
            ->first();

        if (! $answer) {
            throw ValidationException::withMessages(['answerId' => 'تعذر العثور على الإجابة المحددة.']);
        }

        $question = DB::table($questionTable)->where('id', $answer->question_id)->first();
        $type = (string) ($answer->question_type_snapshot ?? $question?->question_type ?? 'multiple');
        $correctAnswer = trim((string) ($answer->correct_answer_snapshot ?? $question?->correct_answer ?? ''));
        $maxPoints = max(0, (float) ($answer->question_points_snapshot ?? $question?->points ?? 0));
        $requiresManualReview = $type === 'text' || $correctAnswer === '' || filled($answer->file_name ?? null);

        if (! $requiresManualReview) {
            throw ValidationException::withMessages(['answerId' => 'هذه الإجابة تُصحح تلقائيًا ولا تحتاج تصحيحًا يدويًا.']);
        }

        if ($score !== null && (float) $score > $maxPoints) {
            throw ValidationException::withMessages([
                'score' => sprintf('الحد الأعلى لدرجة هذه الإجابة هو %s.', $this->formatPoints($maxPoints)),
            ]);
        }

        DB::transaction(function () use ($answerTable, $submissionTable, $answerId, $submissionId, $score, $reviewerId): void {
            DB::table($answerTable)->where('id', $answerId)->update([
                'manual_points' => $score,
                'reviewed_by' => $score === null ? null : $reviewerId,
                'reviewed_at' => $score === null ? null : now(),
            ]);
            DB::table($submissionTable)->where('id', $submissionId)->update(['manual_score' => null]);
        });
    }

    private function formatPoints(float $points): string
    {
        return fmod($points, 1.0) === 0.0 ? (string) (int) $points : rtrim(rtrim(number_format($points, 2), '0'), '.');
    }
}
