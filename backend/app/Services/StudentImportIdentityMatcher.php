<?php

namespace App\Services;

use App\Support\DepartmentContext;
use Illuminate\Support\Facades\DB;

final class StudentImportIdentityMatcher
{
    public function conflicts(array $entries): array
    {
        $profiles = DB::table('registration_requests')->where('department_id', DepartmentContext::id())
            ->get(['full_name', 'login_code', 'answers']);
        $index = [];
        foreach (DB::table('users')->where('department_id', DepartmentContext::id())->get(['full_name', 'login_code']) as $user) {
            $index['name:'.$this->name($user->full_name)][] = $user->login_code;
        }
        foreach ($profiles as $profile) {
            foreach ($this->keys(json_decode($profile->answers ?: '{}', true) ?: []) as $key) {
                $index[$key][] = $profile->login_code;
            }
        }
        $seen = [];
        $conflicts = [];
        foreach ($entries as $entry) {
            $keys = ['name:'.$this->name($entry['name']), ...$this->keys($entry['sourceFields'])];
            $matches = [];
            $duplicateRows = [];
            foreach ($keys as $key) {
                $matches = array_merge($matches, $index[$key] ?? []);
                $duplicateRows = array_merge($duplicateRows, $seen[$key] ?? []);
                $seen[$key][] = $entry['sourceRow'];
            }
            if ($matches !== [] || $duplicateRows !== []) {
                $conflicts[] = ['sourceRow' => $entry['sourceRow'],
                    'loginCodes' => array_values(array_unique($matches)),
                    'duplicateRows' => array_values(array_unique($duplicateRows))];
            }
        }

        return $conflicts;
    }

    private function name(string $name): string
    {
        return trim(preg_replace('/\s+/u', ' ', $name));
    }

    private function keys(array $fields): array
    {
        $keys = [];
        foreach ($fields as $field) {
            if (! is_array($field) || ! is_scalar($field['value'] ?? '')) {
                continue;
            }
            $label = str_replace('ـ', '', (string) ($field['label'] ?? ''));
            $value = preg_replace('/[^0-9]/', '', (string) ($field['value'] ?? ''));
            if (str_contains($label, 'السجل المدني') && strlen($value) === 10) {
                $keys[] = 'identity:'.$value;
            } elseif (str_contains($label, 'الجوال')) {
                $phone = preg_replace('/^(?:00966|966|0)/', '', $value);
                if (preg_match('/^5[0-9]{8}$/', $phone)) {
                    $keys[] = 'phone:'.$phone;
                }
            }
        }

        return array_unique($keys);
    }
}
