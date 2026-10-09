<?php

namespace App\Services\Concerns;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

trait ManagesFinalExamQuestions
{
    public function addFinalExamQuestion(string $branchCode, array $question): array
    {
        $branchCode = $this->normalizeBranchCode($branchCode);
        $this->assertCanManageBranch($branchCode);
        $this->assertFinalExamQuestionSetIsMutable($branchCode);
        $id = (string) str()->uuid();
        $createdAt = now();
        $type = ($question['type'] ?? 'multiple') === 'text' ? 'text' : 'multiple';
        $isTrueFalse = ($question['type'] ?? 'multiple') === 'truefalse';

        DB::table('final_exam_questions')->insert([
            'id' => $id,
            'branch_code' => $branchCode,
            'question_type' => $type,
            'prompt' => trim((string) $question['prompt']),
            'options' => json_encode(
                $isTrueFalse ? ['صح', 'خطأ'] : ($question['options'] ?? []),
                JSON_UNESCAPED_UNICODE
            ),
            'allow_file' => (bool) ($question['allowFile'] ?? false),
            'points' => (int) ($question['points'] ?? 1),
            'correct_answer' => $question['correctAnswer'] ?? '',
            'attachment_name' => '',
            'attachment_type' => '',
            'attachment_data_url' => '',
            'sort_order' => (int) DB::table('final_exam_questions')
                ->where('branch_code', $branchCode)
                ->whereNull('archive_id')
                ->count(),
            'created_at' => $createdAt,
        ]);

        return ['id' => $id, 'createdAt' => $createdAt->toISOString()];
    }

    public function deleteFinalExamQuestion(string $questionId): void
    {
        $question = DB::table('final_exam_questions')->where('id', $questionId)->whereNull('archive_id')
            ->first(['branch_code', 'archive_id']);

        if (! $question) {
            throw ValidationException::withMessages(
                ['questionId' => 'The selected final exam question does not exist.']
            );
        }

        $this->assertCanManageBranch((string) $question->branch_code);
        $this->questionDeletionService->delete('final_exam_questions', [$questionId]);
    }

    public function updateFinalExamQuestion(string $questionId, array $question): void
    {
        $existingQuestion = DB::table('final_exam_questions')->where('id', $questionId)->whereNull('deleted_at')->first();

        if (! $existingQuestion) {
            throw ValidationException::withMessages(['questionId' => 'السؤال المحدد غير موجود.']);
        }

        $this->assertCanManageBranch((string) $existingQuestion->branch_code);
        $this->assertFinalExamQuestionSetIsMutable(
            (string) $existingQuestion->branch_code,
            $existingQuestion->archive_id ?? null
        );
        $type = ($question['type'] ?? 'multiple') === 'text' ? 'text' : 'multiple';
        $isTrueFalse = ($question['type'] ?? 'multiple') === 'truefalse';

        DB::table('final_exam_questions')->where('id', $questionId)->update([
            'question_type' => $type,
            'prompt' => trim((string) $question['prompt']),
            'options' => json_encode(
                $isTrueFalse ? ['صح', 'خطأ'] : ($question['options'] ?? []),
                JSON_UNESCAPED_UNICODE
            ),
            'allow_file' => (bool) ($question['allowFile'] ?? false),
            'points' => (int) ($question['points'] ?? 1),
            'correct_answer' => $question['correctAnswer'] ?? '',
        ]);
    }

    public function copyFinalExamQuestions(string $from, string $to, bool $move): void
    {
        $from = $this->normalizeBranchCode($from);
        $to = $this->normalizeBranchCode($to);
        $this->assertCanManageBranch($from);
        $this->assertCanManageBranch($to);

        if ($from === $to) {
            throw ValidationException::withMessages(
                ['to' => 'The source and target final exam branches must be different.']
            );
        }

        $sourceQuestions = DB::table('final_exam_questions')
            ->where('branch_code', $from)
            ->whereNull('archive_id')
            ->whereNull('deleted_at')
            ->orderBy('sort_order')
            ->get();

        if ($sourceQuestions->isEmpty()) {
            return;
        }

        $this->assertFinalExamQuestionSetIsMutable($to);
        if ($move) {
            $this->assertFinalExamQuestionSetIsMutable($from);
        }

        DB::transaction(function () use ($sourceQuestions, $from, $to, $move): void {
            DB::table('final_exam_questions')->where('branch_code', $to)->whereNull('archive_id')->delete();
            DB::table('final_exam_questions')->insert($sourceQuestions->map(fn ($question) => [
                'id' => (string) str()->uuid(),
                'branch_code' => $to,
                'question_type' => $question->question_type,
                'prompt' => $question->prompt,
                'options' => $question->options,
                'allow_file' => $question->allow_file,
                'points' => $question->points,
                'correct_answer' => $question->correct_answer,
                'attachment_name' => $question->attachment_name,
                'attachment_type' => $question->attachment_type,
                'attachment_path' => $question->attachment_path,
                'attachment_data_url' => $question->attachment_data_url,
                'sort_order' => $question->sort_order,
                'created_at' => now(),
            ])->all());

            if ($move) {
                DB::table('final_exam_questions')->where('branch_code', $from)->whereNull('archive_id')->delete();
            }
        });
    }

    private function assertFinalExamQuestionSetIsMutable(string $branchCode, ?string $archiveId = null): void
    {
        $hasSubmissions = DB::table('final_exam_submissions')
            ->where('branch_code', $branchCode)
            ->when(
                $archiveId,
                fn ($query, $resolvedArchiveId) => $query->where('archive_id', $resolvedArchiveId),
                fn ($query) => $query->whereNull('archive_id'),
            )
            ->exists();

        if ($hasSubmissions) {
            throw ValidationException::withMessages([
                'questionId' => 'Final exam questions cannot be changed after submissions exist.',
            ]);
        }
    }
}
