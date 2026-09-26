<?php

namespace App\Services\Concerns;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

trait ManagesCompletionSettings
{
    private function settings(string $branchCode): object
    {
        if (! in_array($branchCode, ['male', 'female'], true)) {
            throw ValidationException::withMessages(['branchCode' => 'الفرع غير صالح.']);
        }

        $settings = DB::table('completion_requirement_settings')->where('branch_code', $branchCode)->first();
        if (! $settings) {
            throw ValidationException::withMessages(['branchCode' => 'إعدادات متطلبات الفرع غير موجودة.']);
        }

        return $settings;
    }

    private function serializeSettings(object $settings): array
    {
        return [
            'attendanceRequired' => (int) $settings->attendance_required,
            'tasksPercentageRequired' => (int) $settings->tasks_percentage_required,
            'finalExamPercentageRequired' => (int) $settings->final_exam_percentage_required,
            'quranPartsRequired' => (int) $settings->quran_parts_required,
            'isClosed' => (bool) $settings->is_closed,
            'closedAt' => $settings->closed_at ? (string) $settings->closed_at : null,
        ];
    }

    private function syncPractitionerPageContent(): void
    {
        if (! Schema::hasTable('app_settings')) {
            return;
        }

        $setting = DB::table('app_settings')->where('setting_key', 'practitioner_page_content')->first();
        $content = json_decode((string) ($setting->value ?? ''), true);
        if (! is_array($content)) {
            return;
        }

        $branches = DB::table('completion_requirement_settings')
            ->whereIn('branch_code', ['male', 'female'])
            ->get()
            ->keyBy('branch_code');
        $male = $branches->get('male');
        $female = $branches->get('female');
        if (! $male || ! $female) {
            return;
        }

        $content['requirements'][0] = $male->attendance_required === $female->attendance_required
            ? "حضور ما لا يقل عن ({$male->attendance_required}) لقاءات من اللقاءات التدريبية"
            : "الحضور المطلوب: المعلمون ({$male->attendance_required}) لقاءات، "
                ."والمعلمات ({$female->attendance_required}) لقاءات";
        $content['requirements'][1] = $male->tasks_percentage_required === $female->tasks_percentage_required
            ? "تنفيذ ({$male->tasks_percentage_required}%) من المهام الأدائية"
            : "المهام المطلوبة: المعلمون ({$male->tasks_percentage_required}%)، "
                ."والمعلمات ({$female->tasks_percentage_required}%)";
        $content['requirements'][2] = $male->final_exam_percentage_required === $female->final_exam_percentage_required
            ? "اجتياز الاختبار النهائي بنسبة لا تقل عن ({$male->final_exam_percentage_required}%)"
            : "نسبة الاختبار النهائي: المعلمون ({$male->final_exam_percentage_required}%)، "
                ."والمعلمات ({$female->final_exam_percentage_required}%)";
        $content['recitation'][0]['text'] = "المعلمون: عرض ({$male->quran_parts_required}) جزءًا";
        $content['recitation'][1]['text'] = "المعلمات: عرض ({$female->quran_parts_required}) أجزاء";

        DB::table('app_settings')->updateOrInsert(
            ['setting_key' => 'practitioner_page_content'],
            [
                'value' => json_encode($content, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'updated_at' => now(),
                'created_at' => $setting->created_at ?? now(),
            ],
        );
    }
}
