<?php

namespace App\Services\Concerns;

use App\Models\Student;
use Illuminate\Support\Facades\DB;

trait BuildsCompletionStudentRows
{
    private function buildStudentRows($students, object $settings)
    {
        $loginCodes = $students->pluck('login_code')->filter()->values();
        $studentIds = $students->pluck('id')->values();

        $attendance = DB::table('course_attendance')
            ->whereNull('archive_id')
            ->whereIn('login_code', $loginCodes)
            ->selectRaw('login_code, count(distinct course_id) as aggregate')
            ->groupBy('login_code')
            ->pluck('aggregate', 'login_code');

        $taskIds = DB::table('courses')
            ->whereNull('archive_id')
            ->where('entity_type', 'task')
            ->where('is_tasks_enabled', true)
            ->where($settings->branch_code.'_tasks_enabled', true)
            ->pluck('id');
        $taskTotal = $taskIds->count();
        $approvedTasks = DB::table('course_submissions')
            ->whereNull('archive_id')
            ->where('assessment_type', 'tasks')
            ->where('task_review_status', 'approved')
            ->whereIn('course_id', $taskIds)
            ->whereIn('login_code', $loginCodes)
            ->selectRaw('login_code, count(distinct course_id) as aggregate')
            ->groupBy('login_code')
            ->pluck('aggregate', 'login_code');

        $parts = DB::table('student_parts')
            ->whereIn('student_id', $studentIds)
            ->selectRaw('student_id, count(distinct part_number) as aggregate')
            ->groupBy('student_id')
            ->pluck('aggregate', 'student_id');

        $finalQuestions = DB::table('final_exam_questions')
            ->whereNull('archive_id')
            ->where('branch_code', $settings->branch_code)
            ->get();
        $finalSubmissions = DB::table('final_exam_submissions')
            ->whereNull('archive_id')
            ->where('branch_code', $settings->branch_code)
            ->whereIn('login_code', $loginCodes)
            ->get()
            ->keyBy('login_code');
        $finalAnswers = DB::table('final_exam_submission_answers')
            ->whereNull('archive_id')
            ->whereIn('submission_id', $finalSubmissions->pluck('id'))
            ->get()
            ->groupBy('submission_id');

        return $students->map(function (Student $student) use ($settings, $attendance, $taskTotal, $approvedTasks, $parts, $finalQuestions, $finalSubmissions, $finalAnswers): array {
            $attendanceCount = (int) ($attendance[$student->login_code] ?? 0);
            $approvedTaskCount = (int) ($approvedTasks[$student->login_code] ?? 0);
            $taskPercentage = $taskTotal > 0 ? round(($approvedTaskCount / $taskTotal) * 100, 1) : null;
            $quranPartsCount = (int) ($parts[$student->id] ?? 0);
            $finalSubmission = $finalSubmissions->get($student->login_code);
            $finalCalculation = $this->finalCalculation($finalSubmission, $finalQuestions, $finalAnswers);
            $finalScore = $finalCalculation['score'];
            $finalTotal = $finalCalculation['total'];
            $finalPercentage = $finalScore !== null && $finalTotal > 0 ? round(($finalScore / $finalTotal) * 100, 1) : null;

            $details = [
                'attendance' => [
                    'current' => $attendanceCount,
                    'required' => (int) $settings->attendance_required,
                    'met' => $attendanceCount >= (int) $settings->attendance_required,
                ],
                'tasks' => [
                    'approved' => $approvedTaskCount,
                    'total' => $taskTotal,
                    'percentage' => $taskPercentage,
                    'requiredPercentage' => (int) $settings->tasks_percentage_required,
                    'requiredCount' => $taskTotal > 0 ? (int) ceil($taskTotal * ((int) $settings->tasks_percentage_required / 100)) : 0,
                    'met' => $taskPercentage !== null && $taskPercentage >= (int) $settings->tasks_percentage_required,
                ],
                'finalExam' => [
                    'score' => $finalScore,
                    'total' => $finalTotal,
                    'percentage' => $finalPercentage,
                    'requiredPercentage' => (int) $settings->final_exam_percentage_required,
                    'met' => $finalPercentage !== null && $finalPercentage >= (int) $settings->final_exam_percentage_required,
                ],
                'quran' => [
                    'current' => $quranPartsCount,
                    'required' => (int) $settings->quran_parts_required,
                    'met' => $quranPartsCount >= (int) $settings->quran_parts_required,
                ],
            ];
            $passed = collect($details)->every(fn (array $detail): bool => $detail['met'] === true);

            return [
                'id' => $student->id,
                'name' => $student->full_name,
                'loginCode' => $student->login_code,
                'status' => $passed ? 'passed' : 'in_progress',
                'details' => $details,
                'finalizedAt' => null,
            ];
        });
    }

    private function finalCalculation(?object $submission, $questions, $answersBySubmission): array
    {
        $defaultTotal = (float) $questions->sum('points');

        if (! $submission) {
            return ['score' => null, 'total' => $defaultTotal];
        }

        $answers = collect($answersBySubmission->get($submission->id, []))->keyBy('question_id');
        $resolvedQuestions = $questions->map(function ($question) use ($answers): array {
            $answer = $answers->get($question->id);

            return [
                'answer' => trim((string) ($answer?->answer_text ?? '')),
                'correct' => trim((string) ($answer?->correct_answer_snapshot ?? $question->correct_answer)),
                'type' => (string) ($answer?->question_type_snapshot ?? $question->question_type ?? 'multiple'),
                'hasFile' => filled($answer?->file_name ?? null),
                'points' => (float) ($answer?->question_points_snapshot ?? $question->points),
                'manualPoints' => $answer?->manual_points !== null ? (float) $answer->manual_points : null,
            ];
        });
        $total = (float) $resolvedQuestions->sum('points');

        if ($submission->manual_score !== null) {
            return ['score' => (float) $submission->manual_score, 'total' => $total];
        }

        if ($resolvedQuestions->isEmpty() || $resolvedQuestions->contains(
            fn (array $question): bool => ($question['type'] === 'text' || $question['correct'] === '' || $question['hasFile'])
                && $question['manualPoints'] === null,
        )) {
            return ['score' => null, 'total' => $total];
        }

        $score = (float) $resolvedQuestions->sum(fn (array $question): float => (
            $question['type'] === 'text' || $question['correct'] === '' || $question['hasFile']
        )
            ? (float) ($question['manualPoints'] ?? 0)
            : ($this->normalizeAnswer($question['answer']) === $this->normalizeAnswer($question['correct'])
                ? $question['points']
                : 0.0));

        return ['score' => $score, 'total' => $total];
    }

    private function normalizeAnswer(string $value): string
    {
        return mb_strtolower((string) preg_replace('/\s+/u', ' ', trim($value)), 'UTF-8');
    }
}
