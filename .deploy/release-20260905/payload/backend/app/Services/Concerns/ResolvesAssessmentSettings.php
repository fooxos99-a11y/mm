<?php

namespace App\Services\Concerns;

trait ResolvesAssessmentSettings
{
    private function assessmentEnabledColumn(string $assessmentType): string
    {
        return [
            'pre' => 'is_pre_enabled',
            'post' => 'is_post_enabled',
            'tasks' => 'is_tasks_enabled',
        ][$assessmentType] ?? 'is_pre_enabled';
    }

    private function isAssessmentBranchEnabled(object $course, string $assessmentType, string $branchCode): bool
    {
        $column = [
            'male' => [
                'pre' => 'male_pre_enabled',
                'post' => 'male_post_enabled',
                'tasks' => 'male_tasks_enabled',
            ],
            'female' => [
                'pre' => 'female_pre_enabled',
                'post' => 'female_post_enabled',
                'tasks' => 'female_tasks_enabled',
            ],
        ][$branchCode][$assessmentType] ?? null;

        return $column ? (bool) ($course->{$column} ?? false) : false;
    }
}
