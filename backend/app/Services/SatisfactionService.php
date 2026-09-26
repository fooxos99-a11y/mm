<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SatisfactionService
{
    public function addSatisfactionQuestion(
        string $prompt,
        string $type,
        bool $isRequired,
        string $targetScope = 'all',
        ?string $courseId = null,
    ): array {
        $prompt = trim($prompt);
        $type = $type === 'text' ? 'text' : 'rating';
        $targetScope = $targetScope === 'course' ? 'course' : 'all';
        $courseId = $courseId !== null ? trim($courseId) : null;

        if ($prompt === '') {
            throw ValidationException::withMessages(['prompt' => 'نص السؤال مطلوب.']);
        }

        if ($targetScope === 'course') {
            if ($courseId === null || $courseId === '') {
                throw ValidationException::withMessages(['courseId' => 'اختر دورة صالحة.']);
            }

            $targetCourses = DB::table('courses')
                ->where('id', $courseId)
                ->where('entity_type', '!=', 'task')
                ->where('is_post_enabled', true)
                ->orderBy('sort_order')
                ->get();

            if ($targetCourses->isEmpty()) {
                throw ValidationException::withMessages(['courseId' => 'تعذر العثور على الدورة المحددة.']);
            }
        } else {
            $targetCourses = DB::table('courses')
                ->where('entity_type', '!=', 'task')
                ->where('is_post_enabled', true)
                ->orderBy('sort_order')
                ->get();
        }

        if ($targetCourses->isEmpty()) {
            return [];
        }

        $createdAt = now();
        $rows = $targetCourses->map(function ($course) use ($prompt, $type, $isRequired, $createdAt) {
            return [
                'id' => (string) str()->uuid(),
                'course_id' => $course->id,
                'prompt' => $prompt,
                'type' => $type,
                'is_required' => $isRequired,
                'sort_order' => (int) DB::table('satisfaction_questions')->where('course_id', $course->id)->count(),
                'created_at' => $createdAt,
            ];
        })->all();

        DB::table('satisfaction_questions')->insert($rows);

        return array_map(
            fn (array $row) => [
                'id' => $row['id'],
                'courseId' => $row['course_id'],
                'createdAt' => $createdAt->toISOString(),
            ],
            $rows,
        );
    }

    public function deleteSatisfactionQuestion(string $questionId): void
    {
        DB::table('satisfaction_questions')->where('id', $questionId)->delete();
    }

    public function submitSatisfactionResponses(array $responses): array
    {
        $rows = array_map(
            fn (array $response) => [
                'id' => (string) str()->uuid(),
                'course_id' => $response['courseId'],
                'question_id' => $response['questionId'],
                'login_code' => $response['loginCode'],
                'student_name' => $response['studentName'],
                'rating_value' => $response['ratingValue'],
                'text_value' => ($response['textValue'] ?? '') !== '' ? $response['textValue'] : null,
                'submitted_at' => now(),
            ],
            $responses,
        );

        DB::table('satisfaction_responses')->upsert(
            $rows,
            ['course_id', 'question_id', 'login_code'],
            ['student_name', 'rating_value', 'text_value', 'submitted_at'],
        );

        return array_map(
            fn (array $row) => [
                'id' => (string) DB::table('satisfaction_responses')
                    ->where('course_id', $row['course_id'])
                    ->where('question_id', $row['question_id'])
                    ->where('login_code', $row['login_code'])
                    ->value('id'),
                'courseId' => $row['course_id'],
                'questionId' => $row['question_id'],
                'loginCode' => $row['login_code'],
            ],
            $rows,
        );
    }
}
