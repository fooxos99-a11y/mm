<?php

namespace App\Services;

use App\Models\Student;
use App\Services\Concerns\ResolvesAssessmentSettings;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class CourseAssessmentAvailabilityService
{
    use ResolvesAssessmentSettings;

    public function assertOpen(object $course, string $assessmentType, ?Student $student): void
    {
        $enabledColumn = $this->assessmentEnabledColumn($assessmentType);

        if (! (bool) ($course->{$enabledColumn} ?? false)) {
            $this->throwClosed();
        }

        $windows = $this->decodeJsonObject(
            $course->assessment_windows,
            ['global' => [], 'male' => [], 'female' => []],
        );
        $branchCode = $student?->branch?->code;

        if ($branchCode && ! $this->isAssessmentBranchEnabled($course, $assessmentType, $branchCode)) {
            $this->throwClosed();
        }

        $globalWindow = data_get($windows, "global.$assessmentType");

        if (! $branchCode) {
            if ($this->hasWindow($globalWindow) && ! $this->isOpen($globalWindow)) {
                $this->throwClosed();
            }

            return;
        }

        $branchWindow = data_get($windows, "$branchCode.$assessmentType");
        $hasWindowConfig = $this->hasWindow($branchWindow) || $this->hasWindow($globalWindow);

        if ($hasWindowConfig && ! $this->isOpen($branchWindow) && ! $this->isOpen($globalWindow)) {
            $this->throwClosed();
        }
    }

    private function isOpen(mixed $window): bool
    {
        if (! $this->hasWindow($window)) {
            return false;
        }

        $opensAt = is_array($window) ? trim((string) ($window['opensAt'] ?? '')) : '';
        $closesAt = is_array($window)
            ? trim((string) ($window['closesAt'] ?? ''))
            : trim((string) $window);

        try {
            if ($opensAt !== '' && Carbon::parse($opensAt)->isFuture()) {
                return false;
            }

            return $closesAt !== '' && Carbon::parse($closesAt)->isFuture();
        } catch (\Throwable) {
            return false;
        }
    }

    private function hasWindow(mixed $window): bool
    {
        return is_array($window)
            ? trim((string) ($window['closesAt'] ?? '')) !== ''
            : trim((string) $window) !== '';
    }

    private function decodeJsonObject(mixed $value, array $default): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (! is_string($value) || trim($value) === '') {
            return $default;
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : $default;
    }

    private function throwClosed(): never
    {
        throw ValidationException::withMessages([
            'loginId' => ['انتهى وقت الإرسال أو أن التقييم غير متاح حاليًا.'],
        ]);
    }
}
