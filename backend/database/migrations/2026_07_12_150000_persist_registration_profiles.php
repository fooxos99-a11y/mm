<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('registration_requests', function (Blueprint $table) {
            $table->string('phone', 20)->nullable()->after('login_code');
            $table->string('gender', 20)->nullable()->after('phone');
            $table->json('answers')->nullable()->after('gender');
            $table->foreignUuid('student_id')->nullable()->after('answers')->constrained('students')->nullOnDelete();
            $table->index('student_id');
        });

        $metadataPath = storage_path('app/registration-request-metadata.json');
        if (File::exists($metadataPath)) {
            $metadata = json_decode((string) File::get($metadataPath), true);

            foreach (is_array($metadata) ? $metadata : [] as $requestId => $profile) {
                if (! is_array($profile)) {
                    continue;
                }

                DB::table('registration_requests')->where('id', $requestId)->update([
                    'phone' => $profile['phone'] ?? null,
                    'gender' => $profile['gender'] ?? null,
                    'answers' => json_encode($profile['answers'] ?? [], JSON_UNESCAPED_UNICODE),
                ]);
            }
        }

        if (! Schema::hasTable('app_settings')) {
            return;
        }

        $storedFields = json_decode((string) DB::table('app_settings')
            ->where('setting_key', 'registration_form_fields')
            ->value('value'), true);
        $fields = is_array($storedFields) ? $storedFields : [];
        $fields = array_values(array_filter($fields, fn ($field): bool => trim((string) ($field['label'] ?? '')) !== 'رقم الجوال'));

        if (! collect($fields)->contains(fn ($field): bool => ($field['id'] ?? '') === 'age' || ($field['label'] ?? '') === 'العمر')) {
            array_unshift($fields, ['id' => 'age', 'label' => 'العمر', 'type' => 'number', 'required' => true, 'showInRequests' => true, 'options' => []]);
        }

        foreach ($fields as &$field) {
            $field['showInRequests'] = (bool) ($field['showInRequests'] ?? true);
            if (($field['label'] ?? '') === 'اسم الدار') {
                $field['id'] = 'house_name';
                $field['type'] = 'select';
                $field['options'] = ($field['options'] ?? []) ?: ['غير محدد'];
            }
        }
        unset($field);

        if (! collect($fields)->contains(fn ($field): bool => ($field['id'] ?? '') === 'complex_name' || ($field['label'] ?? '') === 'اسم المجمع')) {
            $fields[] = ['id' => 'complex_name', 'label' => 'اسم المجمع', 'type' => 'select', 'required' => false, 'showInRequests' => true, 'options' => ['غير محدد']];
        }

        if (! collect($fields)->contains(fn ($field): bool => ($field['id'] ?? '') === 'house_name' || ($field['label'] ?? '') === 'اسم الدار')) {
            $fields[] = ['id' => 'house_name', 'label' => 'اسم الدار', 'type' => 'select', 'required' => false, 'showInRequests' => true, 'options' => ['غير محدد']];
        }

        DB::table('app_settings')->updateOrInsert(
            ['setting_key' => 'registration_form_fields'],
            ['value' => json_encode($fields, JSON_UNESCAPED_UNICODE), 'updated_at' => now()],
        );
    }

    public function down(): void
    {
        Schema::table('registration_requests', function (Blueprint $table) {
            $table->dropForeign(['student_id']);
            $table->dropIndex(['student_id']);
            $table->dropColumn(['phone', 'gender', 'answers', 'student_id']);
        });
    }
};
