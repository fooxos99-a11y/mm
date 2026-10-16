<?php

namespace Database\Seeders;

use App\Models\User;
use App\Support\DepartmentContext;
use App\Support\DepartmentData;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
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

        DepartmentContext::run(DepartmentContext::DEFAULT_ID, function () use ($loginCode, $password): void {
            DB::transaction(function () use ($loginCode, $password): void {
                $user = User::query()->where('login_code', $loginCode)->lockForUpdate()->first();
                if ($user && ($user->department_id !== DepartmentContext::DEFAULT_ID || $user->role !== 'admin')) {
                    throw new RuntimeException('The seed administrator number belongs to another account.');
                }

                if ($user) {
                    DepartmentData::reserveLoginCode($loginCode, $user->id, DepartmentContext::DEFAULT_ID);
                }

                $passwordHash = $user?->password && Hash::check($password, $user->password)
                    ? $user->password
                    : Hash::make($password);
                $user ??= new User;
                $user->fill([
                    'department_id' => DepartmentContext::DEFAULT_ID,
                    'login_code' => $loginCode,
                    'full_name' => env('MOMARS_SEED_ADMIN_NAME', 'System Admin'),
                    'role' => 'admin',
                    'email' => env('MOMARS_SEED_ADMIN_EMAIL', 'admin@example.test'),
                    'password' => $passwordHash,
                ])->save();

                if (app()->environment('testing') && filter_var(env('MOMARS_SEED_E2E_ROLES', false), FILTER_VALIDATE_BOOLEAN)) {
                    $this->call(EndToEndAccountSeeder::class);
                }
            }, 3);
        });
    }
}
