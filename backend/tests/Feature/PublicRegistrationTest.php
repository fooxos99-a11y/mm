<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class PublicRegistrationTest extends CoreDataApiTestCase
{
    public function test_public_registration_collects_profile_and_admin_assigns_secure_credentials_on_acceptance(): void
    {
        DB::table('registration_settings')->updateOrInsert(
            ['key' => 'is_open'],
            ['value' => '1', 'updated_at' => now()],
        );

        $submitResponse = $this->postJson('/api/public/registration-requests', [
            'name' => 'طالب تجريبي',
            'phone' => '0501234567',
            'gender' => 'female',
            'age' => 22,
        ]);

        $requestId = $submitResponse->json('id');

        $submitResponse
            ->assertCreated()
            ->assertJsonPath('name', 'طالب تجريبي')
            ->assertJsonPath('loginCode', null)
            ->assertJsonPath('phone', '0501234567')
            ->assertJsonPath('gender', 'female')
            ->assertJsonPath('age', 22)
            ->assertJsonPath('branchId', null)
            ->assertJsonPath('status', 'pending');

        $this->assertDatabaseHas('registration_requests', [
            'id' => $requestId,
            'full_name' => 'طالب تجريبي',
            'login_code' => null,
            'branch_code' => null,
            'status' => 'pending',
        ]);

        $this->getJson('/api/dashboard/registration')
            ->assertOk()
            ->assertJsonPath('requests.0.age', 22)
            ->assertJsonPath('requests.0.phone', '0501234567')
            ->assertJsonPath('requests.0.gender', 'female');

        $acceptResponse = $this->postJson('/api/dashboard/registration-requests/'.$requestId.'/accept', [
            'name' => 'طالب تجريبي معدل',
            'loginCode' => '123',
            'password' => 'Registration-456',
            'phone' => '0501234567',
            'gender' => 'female',
            'branchId' => 'female',
            'answers' => ['age' => '22', 'complex_name' => '', 'house_name' => ''],
        ]);

        $acceptResponse
            ->assertOk()
            ->assertJsonPath('name', 'طالب تجريبي معدل')
            ->assertJsonPath('loginCode', '123')
            ->assertJsonPath('age', null)
            ->assertJsonPath('branchId', 'female')
            ->assertJsonPath('status', 'accepted');

        $studentId = DB::table('students')->where('login_code', '123')->value('id');

        $this->assertDatabaseHas('registration_requests', [
            'id' => $requestId,
            'student_id' => $studentId,
            'phone' => '0501234567',
            'gender' => 'female',
            'initial_password' => null,
        ]);

        $this->getJson('/api/dashboard/snapshot')
            ->assertOk()
            ->assertJsonPath('students.0.registrationProfile.phone', '0501234567')
            ->assertJsonPath('students.0.registrationProfile.answers.0.label', 'العمر')
            ->assertJsonPath('students.0.registrationProfile.answers.0.value', '22');

        $this->assertDatabaseHas('students', [
            'full_name' => 'طالب تجريبي معدل',
            'login_code' => '123',
            'branch_id' => DB::table('branches')->where('code', 'female')->value('id'),
        ]);

        $this->assertDatabaseHas('users', [
            'full_name' => 'طالب تجريبي معدل',
            'login_code' => '123',
            'role' => 'student',
        ]);
        $this->assertTrue(Hash::check(
            'Registration-456',
            (string) User::query()->where('login_code', '123')->value('password'),
        ));
        $this->assertFalse((bool) User::query()->where('login_code', '123')->value('must_change_password'));

        $archiveResponse = $this->postJson('/api/dashboard/archives/archive-all', [
            'name' => 'أرشيف بيانات التسجيل',
            'batch_type' => 'all',
        ])->assertOk();

        $archiveId = $archiveResponse->json('archive.id');

        $this->getJson('/api/dashboard/archives/'.$archiveId.'/students/'.$studentId)
            ->assertOk()
            ->assertJsonPath('student.registrationProfile.phone', '0501234567')
            ->assertJsonPath('student.registrationProfile.answers.0.label', 'العمر')
            ->assertJsonPath('student.registrationProfile.answers.0.value', '22');
    }

    public function test_public_registration_requires_ten_digit_phone_and_numeric_answers(): void
    {
        DB::table('registration_settings')->updateOrInsert(
            ['key' => 'is_open'],
            ['value' => '1', 'updated_at' => now()],
        );

        $this->postJson('/api/public/registration-requests', [
            'name' => 'طالب تجريبي',
            'phone' => '050ABC',
            'gender' => 'male',
            'answers' => ['age' => 'عشرون'],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['phone']);

        $this->postJson('/api/public/registration-requests', [
            'name' => 'طالب تجريبي',
            'phone' => '0501234567',
            'gender' => 'male',
            'answers' => ['age' => 'عشرون'],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['answers']);
    }

    public function test_registration_fields_migrate_legacy_phone_to_fixed_phone_and_numeric_age(): void
    {
        DB::table('app_settings')->updateOrInsert(
            ['setting_key' => 'registration_form_fields'],
            [
                'value' => json_encode([
                    ['id' => 'legacy-phone', 'label' => 'رقم الجوال', 'type' => 'text', 'required' => true],
                    [
                        'id' => 'qualification',
                        'label' => 'المؤهل',
                        'type' => 'select',
                        'required' => true,
                        'options' => ['ثانوي'],
                    ],
                ], JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
            ],
        );

        $this->getJson('/api/public/registration')
            ->assertOk()
            ->assertJsonMissing(['id' => 'legacy-phone'])
            ->assertJsonPath('fields.0.id', 'age')
            ->assertJsonPath('fields.0.label', 'العمر')
            ->assertJsonPath('fields.0.type', 'number')
            ->assertJsonPath('fields.1.id', 'qualification');
    }

    public function test_admin_can_rename_fixed_registration_fields_without_changing_their_types(): void
    {
        $this->getJson('/api/public/registration')
            ->assertOk()
            ->assertJsonPath('fixedLabels.name', 'الاسم')
            ->assertJsonPath('fixedLabels.gender', 'الجنس')
            ->assertJsonPath('fixedLabels.phone', 'رقم الجوال');

        $this->putJson('/api/dashboard/registration/fields', [
            'fields' => [
                ['id' => 'age', 'label' => 'العمر', 'type' => 'number', 'required' => true],
            ],
            'fixedLabels' => [
                'name' => '  الاسم الثلاثي  ',
                'gender' => '',
                'phone' => 'رقم الجوال للتواصل',
            ],
        ])
            ->assertOk()
            ->assertJsonPath('fields.0.id', 'age')
            ->assertJsonPath('fixedLabels.name', 'الاسم الثلاثي')
            ->assertJsonPath('fixedLabels.gender', 'الجنس')
            ->assertJsonPath('fixedLabels.phone', 'رقم الجوال للتواصل');

        $this->getJson('/api/public/registration')
            ->assertOk()
            ->assertJsonPath('fixedLabels.name', 'الاسم الثلاثي')
            ->assertJsonPath('fixedLabels.phone', 'رقم الجوال للتواصل')
            ->assertJsonMissing(['id' => 'name']);

        $this->getJson('/api/dashboard/registration')
            ->assertOk()
            ->assertJsonPath('fixedLabels.name', 'الاسم الثلاثي');

        // Saving fields without labels keeps the renamed labels.
        $this->putJson('/api/dashboard/registration/fields', [
            'fields' => [['id' => 'age', 'label' => 'العمر', 'type' => 'number']],
        ])
            ->assertOk()
            ->assertJsonPath('fixedLabels.name', 'الاسم الثلاثي');

        // Only the three built-in fields can be renamed.
        $this->putJson('/api/dashboard/registration/fields', [
            'fields' => [],
            'fixedLabels' => ['branch' => 'الفرع'],
        ])->assertUnprocessable()->assertJsonValidationErrors(['fixedLabels']);

        // Renaming does not relax the fixed phone validation.
        DB::table('registration_settings')->updateOrInsert(
            ['key' => 'is_open'],
            ['value' => '1', 'updated_at' => now()],
        );
        $this->postJson('/api/public/registration-requests', [
            'name' => 'طالب تجريبي',
            'phone' => '05ABC',
            'gender' => 'male',
            'answers' => ['age' => '20'],
        ])->assertUnprocessable()->assertJsonValidationErrors(['phone']);
    }
}
