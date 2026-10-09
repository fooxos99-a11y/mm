<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CourseAssessmentQuestionService
{
    public function snapshots(string $courseId, string $assessmentType, array $submissions): Collection
    {
        $questionIds = [];

        foreach ($submissions as $submission) {
            $submissionQuestionIds = collect($submission['answers'] ?? [])
                ->pluck('questionId')
                ->map(fn ($questionId): string => trim((string) $questionId))
                ->reject(fn (string $questionId): bool => $questionId === '__score_override__')
                ->values();

            if ($submissionQuestionIds->contains('')) {
                throw ValidationException::withMessages([
                    'answers' => ['كل إجابة يجب أن ترتبط بسؤال.'],
                ]);
            }

            if ($submissionQuestionIds->count() !== $submissionQuestionIds->unique()->count()) {
                throw ValidationException::withMessages([
                    'answers' => ['لا يمكن إرسال أكثر من إجابة للسؤال نفسه.'],
                ]);
            }

            $questionIds = [...$questionIds, ...$submissionQuestionIds->all()];
        }

        $questionIds = array_values(array_unique($questionIds));
        if ($questionIds === []) {
            return collect();
        }

        $questions = DB::table('course_questions')
            ->where('course_id', $courseId)
            ->where('assessment_type', $assessmentType)
            ->whereNull('archive_id')
            ->whereNull('deleted_at')
            ->whereIn('id', $questionIds)
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

        if ($questions->count() !== count($questionIds)) {
            throw ValidationException::withMessages([
                'answers' => ['توجد إجابة لا تتبع أسئلة هذا التقييم.'],
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
}
