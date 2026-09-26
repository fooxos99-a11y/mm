<?php

namespace App\Services\Concerns;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

trait ManagesFinalExamSettings
{
    public function updateFinalExamSetting(
        string $branchCode,
        bool $isEnabled,
        ?string $closesAt,
        ?string $notificationTemplate = null
    ): void {
        $branchCode = $this->normalizeBranchCode($branchCode);
        $this->assertCanManageBranch($branchCode);
        $existingSetting = DB::table('final_exam_settings')->where('branch_code', $branchCode)->first();
        $wasEnabled = (bool) ($existingSetting->is_enabled ?? false);
        $resolvedClosesAt = $closesAt ? Carbon::parse($closesAt)->format('Y-m-d H:i:s') : null;
        $resolvedTemplate = $notificationTemplate ?? (string) ($existingSetting->notification_template ?? '');

        DB::table('final_exam_settings')->updateOrInsert(
            ['branch_code' => $branchCode],
            [
                'is_enabled' => $isEnabled,
                'closes_at' => $resolvedClosesAt,
                'notification_template' => $resolvedTemplate,
            ],
        );

        if ($isEnabled && ! $wasEnabled) {
            $this->dispatchFinalExamOpenNotification($branchCode, $resolvedClosesAt, $resolvedTemplate);
        }
    }

    public function updateFinalExamNotificationTemplate(string $branchCode, string $notificationTemplate): void
    {
        $branchCode = $this->normalizeBranchCode($branchCode);
        $this->assertCanManageBranch($branchCode);
        $setting = DB::table('final_exam_settings')->where('branch_code', $branchCode)->first();

        DB::table('final_exam_settings')->updateOrInsert(
            ['branch_code' => $branchCode],
            [
                'notification_template' => $notificationTemplate,
                'is_enabled' => (bool) ($setting->is_enabled ?? false),
                'closes_at' => $setting->closes_at ?? null,
            ],
        );
    }
}
