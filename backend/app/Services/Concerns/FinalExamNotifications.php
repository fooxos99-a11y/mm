<?php

namespace App\Services\Concerns;

use Carbon\Carbon;

trait FinalExamNotifications
{
    private function dispatchFinalExamOpenNotification(
        string $branchCode,
        ?string $closesAt,
        string $notificationTemplate
    ): void {
        $template = trim($notificationTemplate);

        if ($template === '') {
            return;
        }

        $message = $this->fillTemplatePlaceholders($template, [
            'branchLabel' => $this->branchLabel($branchCode),
            'durationMinutes' => (string) $this->resolveMinutesUntil($closesAt),
        ]);

        if (trim($message) === '') {
            return;
        }

        $this->dashboardCommunicationService->addNotification([
            'title' => 'الاختبار النهائي',
            'message' => $message,
            'targetBranchId' => $branchCode,
            'createdByName' => 'النظام',
            'createdByRole' => 'system',
        ]);
    }

    private function resolveMinutesUntil(?string $closesAt): int
    {
        if (! $closesAt) {
            return 0;
        }

        try {
            return max(1, (int) ceil(now()->diffInSeconds(Carbon::parse($closesAt), false) / 60));
        } catch (\Throwable) {
            return 0;
        }
    }

    private function fillTemplatePlaceholders(string $template, array $replacements): string
    {
        $pairs = [];

        foreach ($replacements as $key => $value) {
            $pairs['{'.$key.'}'] = (string) $value;
        }

        return strtr($template, $pairs);
    }

    private function assessmentLabel(string $assessmentType): string
    {
        return [
            'pre' => 'الاختبار القبلي',
            'post' => 'الاختبار البعدي',
            'tasks' => 'المهام الأدائية',
        ][$assessmentType] ?? $assessmentType;
    }

    private function branchLabel(string $branchCode): string
    {
        return [
            'male' => 'معلمين',
            'female' => 'معلمات',
        ][$this->normalizeBranchCode($branchCode)] ?? $branchCode;
    }

    /**
     * @return array{0: string, 1: string}
     */
}
