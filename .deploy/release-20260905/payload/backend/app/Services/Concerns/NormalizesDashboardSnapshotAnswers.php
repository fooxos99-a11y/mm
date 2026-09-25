<?php

namespace App\Services\Concerns;

trait NormalizesDashboardSnapshotAnswers
{
    private function normalizeSubmissionAnswer(object $answer, ?object $question, bool $canViewAnswerKey): array
    {
        $options = $answer->question_options_snapshot ?? $question?->options ?? '[]';
        $questionType = (string) ($answer->question_type_snapshot ?? $question?->question_type ?? 'multiple');
        $correctAnswer = (string) ($answer->correct_answer_snapshot ?? $question?->correct_answer ?? '');
        $points = (int) ($answer->question_points_snapshot ?? $question?->points ?? 0);
        $requiresManualReview = $questionType === 'text'
            || trim($correctAnswer) === ''
            || filled($answer->file_name ?? null);
        $manualPoints = $answer->manual_points !== null ? (float) $answer->manual_points : null;
        $isCorrect = $requiresManualReview ? null : $this->snapshotAnswersMatch(
            (string) ($answer->answer_text ?? ''),
            $correctAnswer,
        );

        return [
            'id' => $answer->id,
            'questionId' => $answer->question_id,
            'value' => $answer->answer_text ?? '',
            'fileName' => $answer->file_name,
            'fileType' => $answer->file_type,
            'fileDataUrl' => $this->assessmentAttachmentService->temporaryUrl(
                $answer->file_path ?? null,
                $answer->file_data_url ?? null,
            ),
            'prompt' => (string) ($answer->question_prompt_snapshot ?? $question?->prompt ?? ''),
            'type' => $this->mapQuestionType($questionType, $options),
            'options' => $this->decodeJsonArray($options),
            'correctAnswer' => $canViewAnswerKey ? $correctAnswer : '',
            'points' => $points,
            'allowFile' => (bool) ($answer->allow_file_snapshot ?? $question?->allow_file ?? false),
            'requiresManualReview' => $requiresManualReview,
            'manualPoints' => $manualPoints,
            'awardedPoints' => $requiresManualReview ? $manualPoints : ($isCorrect ? (float) $points : 0.0),
            'isCorrect' => $isCorrect,
            'reviewedAt' => $answer->reviewed_at ? (string) $answer->reviewed_at : null,
        ];
    }

    private function snapshotAnswersMatch(string $answer, string $correctAnswer): bool
    {
        $normalize = static fn (string $value): string => mb_strtolower(
            (string) preg_replace('/\s+/u', ' ', trim($value)),
            'UTF-8',
        );

        return $normalize($answer) === $normalize($correctAnswer);
    }

    private function restoreAnswerSnapshotColumns(array $answer, object $question): array
    {
        $options = array_key_exists('options', $answer)
            ? $answer['options']
            : $this->decodeJsonArray($question->options ?? null);
        $normalizedOptions = is_array($options)
            ? array_values($options)
            : $this->decodeJsonArray($options);
        $questionType = array_key_exists('type', $answer)
            ? (string) $answer['type']
            : (string) ($question->question_type ?? 'multiple');

        return [
            'question_prompt_snapshot' => array_key_exists('prompt', $answer)
                ? (string) $answer['prompt']
                : (string) ($question->prompt ?? ''),
            'question_type_snapshot' => $questionType === 'text' ? 'text' : 'multiple',
            'question_options_snapshot' => json_encode($normalizedOptions, JSON_UNESCAPED_UNICODE),
            'correct_answer_snapshot' => array_key_exists('correctAnswer', $answer)
                ? (string) $answer['correctAnswer']
                : (string) ($question->correct_answer ?? ''),
            'question_points_snapshot' => array_key_exists('points', $answer)
                ? (int) $answer['points']
                : (int) ($question->points ?? 0),
            'allow_file_snapshot' => array_key_exists('allowFile', $answer)
                ? (bool) $answer['allowFile']
                : (bool) ($question->allow_file ?? false),
        ];
    }
}
