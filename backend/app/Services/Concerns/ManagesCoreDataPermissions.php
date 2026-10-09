<?php

namespace App\Services\Concerns;

use App\Models\Branch;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

trait ManagesCoreDataPermissions
{
    use MapsQuestionTypes;

    public function loadRolePermissions(): array
    {
        $result = ['male_manager' => [], 'female_manager' => []];

        foreach (DB::table('role_permissions')->get() as $row) {
            if (! isset($result[$row->role])) {
                $result[$row->role] = [];
            }

            $result[$row->role][$row->permission_key] = (bool) $row->is_enabled;
        }

        return $result;
    }

    public function setRolePermission(string $role, string $key, bool $isEnabled): void
    {
        DB::table('role_permissions')->updateOrInsert(
            ['role' => $role, 'permission_key' => $key],
            ['is_enabled' => $isEnabled],
        );
    }

    private function resolveBranchByCode(string $branchCode): Branch
    {
        $branchCode = trim($branchCode);

        if ($branchCode === '') {
            throw ValidationException::withMessages(['branchId' => 'أدخل رمز الفرع.']);
        }

        $branch = Branch::query()->where('code', $branchCode)->first();

        if (! $branch) {
            throw ValidationException::withMessages(['branchId' => sprintf('الفرع %s غير موجود.', $branchCode)]);
        }

        return $branch;
    }

    private function normalizeBranchCode(string $branchCode): string
    {
        $branchCode = trim($branchCode);

        if (! in_array($branchCode, ['male', 'female'], true)) {
            throw ValidationException::withMessages(['branchCode' => 'رمز الفرع غير صالح.']);
        }

        return $branchCode;
    }

    private function normalizeCourseQuestions(Collection $items, bool $includeAnswerKey = false): array
    {
        return $items->map(fn ($item) => [
            'id' => $item->id,
            'prompt' => $item->prompt,
            'type' => $this->mapQuestionType($item->question_type, $item->options),
            'options' => $this->decodeJsonArray($item->options),
            'allowFile' => (bool) $item->allow_file,
            'points' => (int) $item->points,
            'correctAnswer' => $includeAnswerKey ? ($item->correct_answer ?? '') : '',
            'attachmentName' => $item->attachment_name ?? '',
            'attachmentType' => $item->attachment_type ?? '',
            'attachmentDataUrl' => $this->assessmentAttachmentService->temporaryUrl(
                $item->attachment_path ?? null,
                $item->attachment_data_url ?? null,
            ),
        ])->values()->all();
    }

    private function decodeJsonArray(mixed $value): array
    {
        if (is_array($value)) {
            return array_values($value);
        }

        if (! is_string($value) || trim($value) === '') {
            return [];
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? array_values($decoded) : [];
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

    private function normalizeFinalExamSetting(mixed $setting): array
    {
        if (! $setting) {
            return [
                'isEnabled' => false,
                'closesAt' => null,
                'notificationTemplate' => 'تم فتح الاختبار النهائي لفرع {branchLabel} لمدة {durationMinutes} دقيقة.',
            ];
        }

        return [
            'isEnabled' => (bool) $setting->is_enabled,
            'closesAt' => $setting->closes_at,
            'notificationTemplate' => $setting->notification_template !== ''
                ? $setting->notification_template
                : 'تم فتح الاختبار النهائي لفرع {branchLabel} لمدة {durationMinutes} دقيقة.',
        ];
    }
}
