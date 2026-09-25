<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class AppSettingsService
{
    public function loadJson(string $settingKey, array $default): array
    {
        if (! Schema::hasTable('app_settings')) {
            return $default;
        }

        $value = DB::table('app_settings')->where('setting_key', $settingKey)->value('value');

        if (! is_string($value) || trim($value) === '') {
            return $default;
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : $default;
    }

    public function storeJson(string $settingKey, array $value): void
    {
        if (! Schema::hasTable('app_settings')) {
            throw ValidationException::withMessages([
                'settings' => 'Settings table is unavailable. Run migrations first.',
            ]);
        }

        DB::table('app_settings')->updateOrInsert(
            ['setting_key' => $settingKey],
            [
                'value' => json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'updated_at' => now(),
            ],
        );
    }
}
