<?php

namespace App\Services\Concerns;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

trait ManagesCourseAssessmentReviews
{
    public function setAssessmentManualScore(string $submissionId, float|int|null $score): void
    {
        if (DB::table('course_submissions')->where('id', $submissionId)->where('assessment_type', 'tasks')->exists()) {
            throw ValidationException::withMessages(['score' => 'المهام الأدائية تعتمد أو ترفض ولا تقيم بدرجة.']);
        }
        DB::table('course_submissions')->where('id', $submissionId)->update(['manual_score' => $score]);
        $this->flushDashboardCaches();
    }

    public function setTaskReviewStatus(string $submissionId, string $status, string $reviewerId): void
    {
        $updated = DB::table('course_submissions')
            ->where('id', $submissionId)
            ->where('assessment_type', 'tasks')
            ->update([
                'task_review_status' => $status,
                'task_reviewed_by' => $reviewerId,
                'task_reviewed_at' => now(),
                'manual_score' => null,
            ]);

        if ($updated === 0) {
            throw ValidationException::withMessages(['submissionId' => 'تعذر العثور على المهمة المرسلة.']);
        }
        $this->flushDashboardCaches();
    }

    private function flushDashboardCaches(): void
    {
        $this->dashboardCommunicationService->clearCaches();
    }
}
