<?php

namespace App\Services;

use App\Models\Branch;
use App\Support\DepartmentContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

final class StudentImportValidator
{
    public function validate(array $data): array
    {
        $data = Validator::make($data, [
            'sourceHash' => ['required', 'string', 'regex:/^[a-f0-9]{64}$/'],
            'branchId' => ['required', 'string', 'max:100'],
            'entries' => ['required', 'array', 'min:1', 'max:500'],
            'entries.*.name' => ['required', 'string', 'max:255'],
            'entries.*.loginCode' => ['required', 'string', 'max:255', 'distinct:strict'],
            'entries.*.password' => ['required', 'string', 'min:1', 'max:255'],
            'entries.*.sourceRow' => ['required', 'integer', 'min:1', 'distinct:strict'],
            'entries.*.sourceFields' => ['present', 'array', 'max:40'],
            'entries.*.sourceFields.*.label' => ['required', 'string', 'max:255'],
            'entries.*.sourceFields.*.value' => ['present', 'nullable', 'string', 'max:4000'],
        ])->validate();
        abort_unless(DepartmentContext::id(), 403);
        if (! Branch::query()->where('code', $data['branchId'])->exists()) {
            throw ValidationException::withMessages(['branchId' => 'الفرع المحدد غير موجود.']);
        }
        foreach ($data['entries'] as &$entry) {
            $entry['name'] = trim($entry['name']);
            $entry['loginCode'] = trim($entry['loginCode']);
            if ($entry['name'] === '' || $entry['loginCode'] === '') {
                throw ValidationException::withMessages(['entries' => 'أكمل الاسم ورقم الدخول في كل صف.']);
            }
        }
        unset($entry);
        if (count(array_unique(array_column($data['entries'], 'loginCode'))) !== count($data['entries'])) {
            throw ValidationException::withMessages(['entries' => 'توجد أرقام دخول مكررة داخل الملف.']);
        }

        return $data;
    }

    public function conflicts(array $entries): array
    {
        $codes = array_column($entries, 'loginCode');
        $conflicts = [];
        foreach (['users', 'students', 'reserved_login_codes', 'registration_requests'] as $table) {
            $query = DB::table($table)->whereIn('login_code', $codes);
            if ($table === 'students') {
                $query->orWhereIn('archived_login_code', $codes);
                $conflicts = array_merge($conflicts, $query->pluck('archived_login_code')->all());
            }
            $conflicts = array_merge($conflicts, $query->pluck('login_code')->all());
        }

        return array_values(array_intersect($codes, array_unique($conflicts)));
    }

    public function warnings(array $entries): array
    {
        $warnings = [];
        foreach ($entries as $entry) {
            foreach ($entry['sourceFields'] as $field) {
                $label = $field['label'];
                $value = trim((string) $field['value']);
                $issue = null;
                if (str_contains($label, 'السجل المدني') && ! preg_match('/^[12][0-9]{9}$/', $value)) {
                    $issue = 'رقم الهوية يحتاج مراجعة';
                } elseif (str_contains($label, 'الجوال') && ! preg_match('/^(?:0?5[0-9]{8}|(?:\+?966|00966)5[0-9]{8})$/', $value)) {
                    $issue = 'بيانات الجوال تحتاج مراجعة';
                } elseif ($label === 'الإيميل' && ! filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    $issue = 'البريد الإلكتروني يحتاج مراجعة';
                }
                if ($issue) {
                    $warnings[] = ['sourceRow' => $entry['sourceRow'], 'message' => $issue];
                }
            }
        }

        return $warnings;
    }
}
