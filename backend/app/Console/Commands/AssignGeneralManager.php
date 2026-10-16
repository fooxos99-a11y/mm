<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

final class AssignGeneralManager extends Command
{
    protected $signature = 'departments:assign-general-manager {loginCode : Existing registered account number}';

    protected $description = 'Assign the general manager role to an explicitly identified registered account';

    public function handle(): int
    {
        $user = User::query()->where('login_code', trim($this->argument('loginCode')))->first();
        if (! $user || ! $user->is_active || ! in_array($user->role, ['unassigned', 'admin', 'super_admin'], true)) {
            $this->error('الحساب غير موجود أو غير متاح لتعيينه مديرًا عامًا.');

            return self::FAILURE;
        }
        if (DB::table('departments')->where('manager_user_id', $user->id)->exists()) {
            $this->error('عيّن مسؤولًا بديلًا لإدارة هذا الحساب قبل ترقيته.');

            return self::FAILURE;
        }
        $user->forceFill(['role' => 'super_admin', 'department_id' => null])->save();
        $user->invalidateAuthentication();
        $this->info('تم تعيين المدير العام. سجّل الدخول من جديد.');

        return self::SUCCESS;
    }
}
