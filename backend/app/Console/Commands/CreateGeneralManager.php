<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\Security\PasswordPolicy;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use RuntimeException;
use Symfony\Component\Console\Input\StreamableInputInterface;
use Throwable;

final class CreateGeneralManager extends Command
{
    protected $signature = 'departments:create-general-manager
        {loginCode : New globally unique account number}
        {name : Full name of the new general manager}
        {--password-stdin : Read the password from standard input without displaying it}';

    protected $description = 'Create a new general manager account using private password input';

    public function handle(): int
    {
        $password = null;
        try {
            $password = $this->readPassword();
            $loginCode = trim((string) $this->argument('loginCode'));
            $name = trim((string) $this->argument('name'));
            if (Validator::make(['loginCode' => $loginCode, 'name' => $name, 'password' => $password], [
                'loginCode' => ['required', 'string', 'min:4', 'max:100', 'regex:/^[\pL\pN]+$/u'],
                'name' => ['required', 'string', 'min:6', 'max:255'],
                'password' => ['required', 'string', PasswordPolicy::rule()],
            ])->fails()) {
                $this->error('تعذر إنشاء الحساب. تحقق من الاسم ورقم الدخول وكلمة المرور المكونة من 8 أرقام.');

                return self::FAILURE;
            }

            $this->createUser($loginCode, $name, $password);
            $this->info('تم إنشاء حساب المدير العام.');

            return self::SUCCESS;
        } catch (Throwable) {
            // Console errors must never include input, SQL bindings, or exception traces.
            $this->error('تعذر إنشاء الحساب. تحقق من توفر قاعدة البيانات وعدم استخدام رقم الدخول مسبقًا.');

            return self::FAILURE;
        } finally {
            $password = null;
        }
    }

    private function readPassword(): string
    {
        if (! $this->option('password-stdin')) {
            if (! $this->input->isInteractive()) {
                throw new RuntimeException('Private password input is required.');
            }

            return (string) $this->secret('كلمة المرور (8 أرقام)', false);
        }

        $stream = $this->input instanceof StreamableInputInterface ? $this->input->getStream() : null;
        $stream ??= defined('STDIN') ? STDIN : null;
        if (! is_resource($stream)) {
            throw new RuntimeException('Standard input is unavailable.');
        }
        $password = stream_get_contents($stream, 4097);
        if ($password === false) {
            throw new RuntimeException('Could not read private input.');
        }

        return rtrim($password, "\r\n");
    }

    private function createUser(string $loginCode, string $name, #[\SensitiveParameter] string $password): void
    {
        DB::transaction(function () use ($loginCode, $name, $password): void {
            if (DB::table('users')->where('login_code', $loginCode)->exists()
                || DB::table('reserved_login_codes')->where('login_code', $loginCode)->exists()
                || DB::table('students')->where(fn ($query) => $query->where('login_code', $loginCode)
                    ->orWhere('archived_login_code', $loginCode))->exists()) {
                throw new RuntimeException('Account number is unavailable.');
            }

            User::query()->create([
                'full_name' => $name, 'login_code' => $loginCode, 'password' => Hash::make($password),
                'role' => 'super_admin', 'department_id' => null, 'is_active' => true,
                'must_change_password' => false,
            ]);
        }, 3);
    }
}
