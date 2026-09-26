<?php

namespace App\Services\Concerns;

trait SerializesResultsPages
{
    // Reuse the same answer snapshots, attachment URLs and permission rules as the legacy dashboard.
    public function serializeResultsPage(
        $courses,
        $questions,
        $submissions,
        $answers,
        $attendance,
        $finalQuestions,
        $finalSubmissions,
        $finalAnswers,
        bool $courseKeys,
        bool $finalKeys
    ): array {
        $grouped = $questions->groupBy('course_id')->map(fn ($items) => [
            'pre' => $this->normalizeCourseQuestions($items->where('assessment_type', 'pre'), $courseKeys),
            'post' => $this->normalizeCourseQuestions($items->where('assessment_type', 'post'), $courseKeys),
            'tasks' => $this->normalizeCourseQuestions($items->where('assessment_type', 'tasks'), $courseKeys),
        ]);
        $courseData = $this->serializeDashboardCourses($courses, $grouped, collect(), $submissions,
            $answers->groupBy('submission_id'), $questions->keyBy('id'), $courseKeys, $attendance, collect());
        $finalData = $this->serializeDashboardFeedback(collect(), collect(), $finalQuestions, $finalSubmissions,
            $finalAnswers->groupBy('submission_id'), $finalQuestions->keyBy('id'), $finalKeys, collect(), '');

        return array_intersect_key($courseData, array_flip(['courses', 'submissions', 'attendance']))
            + array_intersect_key($finalData, array_flip(['finalExamQuestions', 'finalExamSubmissions']));
    }
}
