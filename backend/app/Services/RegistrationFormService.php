<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;

class RegistrationFormService
{
    public const FIXED_FIELD_IDS = ['name', 'gender', 'phone'];

    private const FIXED_LABELS_SETTING = 'registration_fixed_field_labels';

    private const DEFAULT_FIXED_LABELS = [
        'name' => 'الاسم',
        'gender' => 'الجنس',
        'phone' => 'رقم الجوال',
    ];

    public function __construct(private readonly AppSettingsService $appSettingsService) {}

    public function load(): array
    {
        return $this->normalize(
            $this->appSettingsService->loadJson('registration_form_fields', $this->defaults()),
        );
    }

    public function update(array $fields): array
    {
        $normalized = $this->normalize($fields);
        $this->appSettingsService->storeJson('registration_form_fields', $normalized);

        return $normalized;
    }

    /**
     * Display labels for the built-in name, gender and phone fields.
     * Only the wording can change; their input types and validation stay fixed.
     */
    public function loadFixedLabels(): array
    {
        return $this->normalizeFixedLabels(
            $this->appSettingsService->loadJson(self::FIXED_LABELS_SETTING, []),
        );
    }

    public function updateFixedLabels(array $labels): array
    {
        $normalized = $this->normalizeFixedLabels(array_merge($this->loadFixedLabels(), $labels));
        $this->appSettingsService->storeJson(self::FIXED_LABELS_SETTING, $normalized);

        return $normalized;
    }

    public function normalizeAnswers(array $answers): array
    {
        $normalized = [];

        foreach ($this->load() as $field) {
            $value = trim((string) ($answers[$field['id']] ?? ''));

            if ($field['required'] && $value === '') {
                throw ValidationException::withMessages([
                    'answers' => ['أكمل بيانات التسجيل المطلوبة.'],
                ]);
            }

            if ($value !== '' && $field['type'] === 'select' && ! in_array($value, $field['options'], true)) {
                throw ValidationException::withMessages([
                    'answers' => ['اختر قيمة صحيحة من القائمة.'],
                ]);
            }

            if ($value !== '' && $field['type'] === 'number' && ! preg_match('/^\d+$/', $value)) {
                throw ValidationException::withMessages([
                    'answers' => ['أدخل رقمًا صحيحًا في الحقول الرقمية.'],
                ]);
            }

            $normalized[$field['id']] = [
                'label' => $field['label'],
                'value' => $value,
                'type' => $field['type'],
                'showInRequests' => $field['showInRequests'] ?? true,
            ];
        }

        return $normalized;
    }

    private function normalize(array $fields): array
    {
        $hasLegacyPhoneField = collect($fields)->contains(
            fn ($field): bool => trim((string) ($field['label'] ?? '')) === 'رقم الجوال',
        );

        $normalized = collect($fields)
            ->map(function ($field): array {
                $type = in_array(($field['type'] ?? 'text'), ['text', 'number', 'select'], true)
                    ? $field['type']
                    : 'text';
                $options = collect($field['options'] ?? [])
                    ->map(fn ($option) => trim((string) $option))
                    ->filter()
                    ->values()
                    ->all();

                if ($type === 'select' && $options === []) {
                    $options = ['خيار 1'];
                }

                return [
                    'id' => trim((string) ($field['id'] ?? '')) ?: (string) str()->uuid(),
                    'label' => trim((string) ($field['label'] ?? '')),
                    'type' => $type,
                    'required' => (bool) ($field['required'] ?? true),
                    'showInRequests' => (bool) ($field['showInRequests'] ?? true),
                    'options' => $type === 'select' ? $options : [],
                ];
            })
            ->filter(fn (array $field): bool => $field['label'] !== '' && $field['label'] !== 'رقم الجوال')
            ->values()
            ->all();

        if ($hasLegacyPhoneField && ! collect($normalized)->contains('id', 'age')) {
            array_unshift($normalized, $this->defaults()[0]);
        }

        return $normalized;
    }

    private function normalizeFixedLabels(array $labels): array
    {
        $normalized = [];

        foreach (self::DEFAULT_FIXED_LABELS as $fieldId => $defaultLabel) {
            $label = trim((string) ($labels[$fieldId] ?? ''));
            $normalized[$fieldId] = $label !== '' ? mb_substr($label, 0, 255) : $defaultLabel;
        }

        return $normalized;
    }

    private function defaults(): array
    {
        return [
            [
                'id' => 'age',
                'label' => 'العمر',
                'type' => 'number',
                'required' => true,
                'showInRequests' => true,
                'options' => [],
            ],
            [
                'id' => 'complex_name',
                'label' => 'اسم المجمع',
                'type' => 'select',
                'required' => false,
                'showInRequests' => true,
                'options' => ['غير محدد'],
            ],
            [
                'id' => 'house_name',
                'label' => 'اسم الدار',
                'type' => 'select',
                'required' => false,
                'showInRequests' => true,
                'options' => ['غير محدد'],
            ],
        ];
    }
}
