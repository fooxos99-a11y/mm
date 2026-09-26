<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $loginCode = trim((string) env('MOMARS_SEED_ADMIN_LOGIN', ''));
        $password = (string) env('MOMARS_SEED_ADMIN_PASSWORD', '');

        if ($loginCode === '' || $password === '') {
            return;
        }

        User::query()->updateOrCreate(
            ['login_code' => $loginCode],
            [
                'full_name' => env('MOMARS_SEED_ADMIN_NAME', 'System Admin'),
                'role' => 'admin',
                'email' => env('MOMARS_SEED_ADMIN_EMAIL', 'admin@example.test'),
                'password' => Hash::make($password),
            ],
        );

        if (app()->environment('testing') && filter_var(env('MOMARS_SEED_E2E_ROLES', false), FILTER_VALIDATE_BOOLEAN)) {
            $this->call(EndToEndAccountSeeder::class);
        }
    }
}
