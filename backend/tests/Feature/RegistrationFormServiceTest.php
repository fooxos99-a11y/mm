<?php

namespace Tests\Feature;

use App\Services\RegistrationFormService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class RegistrationFormServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_legacy_phone_field_is_replaced_by_the_fixed_age_field(): void
    {
        DB::table('app_settings')->updateOrInsert(
            ['setting_key' => 'registration_form_fields'],
            [
                'value' => json_encode([
                    ['id' => 'phone', 'label' => 'رقم الجوال', 'type' => 'text'],
                    ['id' => 'city', 'label' => 'المدينة', 'type' => 'select', 'options' => ['الرياض']],
                ], JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
            ],
        );

        $fields = app(RegistrationFormService::class)->load();

        $this->assertSame('age', $fields[0]['id']);
        $this->assertFalse(collect($fields)->contains('label', 'رقم الجوال'));
        $this->assertTrue(collect($fields)->contains('id', 'city'));
    }

    public function test_numeric_registration_answers_are_validated_in_the_form_service(): void
    {
        $service = app(RegistrationFormService::class);

        $this->expectException(ValidationException::class);
        $service->normalizeAnswers(['age' => 'غير رقمي']);
    }
}
