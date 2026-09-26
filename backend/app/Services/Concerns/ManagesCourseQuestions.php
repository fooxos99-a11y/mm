<?php

namespace App\Services\Concerns;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

trait ManagesCourseQuestions
{
    public function syncCourseQuestions(
        string $courseId,
        string $assessmentType,
        array $questions,
        array $deletedQuestionIds = [],
        array $courseUpdates = [],
    ): void {
        DB::transaction(function () use (
            $courseId,
            $assessmentType,
            $questions,
            $deletedQuestionIds,
            $courseUpdates
        ): void {
            $referencedIds = collect($questions)->pluck('id')->filter()
                ->merge($deletedQuestionIds)->unique()->values();

            if ($referencedIds->isNotEmpty()) {
                $ownedIds = DB::table('course_questions')
                    ->where('course_id', $courseId)
                    ->where('assessment_type', $assessmentType)
                    ->whereIn('id', $referencedIds->all())
                    ->pluck('id');

                if ($ownedIds->count() !== $referencedIds->count()) {
                    throw ValidationException::withMessages([
                        'questions' => ['تتضمن القائمة أسئلة لا تنتمي إلى الدورة أو نوع التقييم المحدد.'],
                    ]);
                }
            }

            if ($courseUpdates !== []) {
                $this->updateCourse($courseId, $courseUpdates);
            }

            foreach ($deletedQuestionIds as $questionId) {
                $this->courseQuestionService->delete($questionId);
            }

            foreach ($questions as $question) {
                $questionId = trim((string) ($question['id'] ?? ''));

                if ($questionId !== '') {
                    $this->courseQuestionService->update($questionId, $question);

                    continue;
                }

                $this->courseQuestionService->create($courseId, $assessmentType, $question);
            }
        });
    }

    public function addCourseQuestion(string $courseId, string $assessmentType, array $question): string
    {
        return $this->courseQuestionService->create($courseId, $assessmentType, $question);
    }

    public function deleteCourseQuestion(string $questionId): void
    {
        $this->courseQuestionService->delete($questionId);
    }

    public function updateCourseQuestion(string $questionId, array $question): void
    {
        $this->courseQuestionService->update($questionId, $question);
    }
}
