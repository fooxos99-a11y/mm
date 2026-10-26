<?php

namespace App\Services;

use App\Models\User;
use App\Support\DepartmentContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class DashboardAccountService
{
    public function __construct(private readonly DashboardAccessHistory $history)
    {
    }

    public function list(): array
    {
        return User::query()->where('department_id', DepartmentContext::id())
            ->whereIn('role', ['admin', 'male_manager', 'female_manager'])->orderByDesc('created_at')->get()
            ->map(fn (User $user) => $this->serialize($user))->all();
    }

    public function serialize(User $user): array
    {
        $current = (string) auth()->id() === (string) $user->id;
        $manager = DB::table('departments')->where('id', DepartmentContext::id())->where('manager_user_id', $user->id)->exists();

        return ['id' => $user->id, 'name' => $user->full_name, 'loginCode' => $user->login_code ?? '', 'role' => $user->role,
            'isActive' => (bool) $user->is_active, 'createdAt' => $user->created_at?->toIso8601String(),
            'lastLoginAt' => $user->last_login_at?->toIso8601String(), 'revision' => $this->revision($user),
            'isProtected' => $current || $manager,
            'protectionReason' => $current ? 'حسابك الحالي؛ لا يمكن حذفه أو تعطيله أو تغيير دوره.'
                : ($manager ? 'مسؤول الإدارة؛ استبداله من إدارة الإدارات لدى المدير العام.' : '')];
    }

    private function revision(User $user): string
    {
        return hash('sha256', json_encode([$user->full_name, $user->login_code, $user->role, $user->is_active,
            $user->getRawOriginal('password')], JSON_THROW_ON_ERROR));
    }

    private function account(string $id): User
    {
        return User::query()->where('department_id', DepartmentContext::id())->whereKey($id)
            ->whereIn('role', ['admin', 'male_manager', 'female_manager'])->lockForUpdate()->firstOrFail();
    }

    private function validateLogin(string $login, ?string $except = null): void
    {
        $duplicate = User::query()->where('login_code', $login)->when($except, fn ($query) => $query->where('id', '!=', $except))->exists();
        $reserved = DB::table('reserved_login_codes')->where('login_code', $login)
            ->when($except, fn ($query) => $query->where(fn ($row) => $row->where('user_id', '!=', $except)->orWhereNull('user_id')))->exists();
        if ($duplicate || $reserved) {
            throw ValidationException::withMessages(['loginCode' => 'رقم الدخول مستخدم مسبقًا.']);
        }
    }

    private function guardRemoval(User $user): void
    {
        $record = $this->serialize($user);
        if ($record['isProtected']) {
            throw ValidationException::withMessages(['accountId' => $record['protectionReason']]);
        }
        if ($user->role === 'admin' && $user->is_active && User::query()->where('department_id', DepartmentContext::id())
            ->where('role', 'admin')->where('is_active', true)->count() <= 1) {
            throw ValidationException::withMessages(['accountId' => 'لا يمكن تعطيل آخر مسؤول إدارة أو حذف حسابه.']);
        }
    }

    public function create(string $name, string $loginCode, string $role, string $password): User
    {
        if (trim($name) === '' || trim($loginCode) === '' || ! in_array($role, ['admin', 'male_manager', 'female_manager'], true)) {
            throw ValidationException::withMessages(['role' => 'أدخل بيانات حساب إشرافي صالحة.']);
        }

        return DB::transaction(function () use ($name, $loginCode, $role, $password) {
            DB::table('departments')->where('id', DepartmentContext::id())->lockForUpdate()->first();
            $this->validateLogin(trim($loginCode));
            $user = User::query()->create(['department_id' => DepartmentContext::id(), 'full_name' => trim($name),
                'role' => $role, 'login_code' => trim($loginCode), 'password' => Hash::make($password), 'must_change_password' => false]);
            app(ManagedPasswordService::class)->remember($user, $password);
            $this->history->record('إضافة حساب', $user->full_name, [['label' => 'الدور', 'after' => $role]]);

            return $user;
        });
    }

    public function update(string $id, array $data): array
    {
        return DB::transaction(function () use ($id, $data) {
            DB::table('departments')->where('id', DepartmentContext::id())->lockForUpdate()->first();
            $user = $this->account($id);
            abort_unless(hash_equals($this->revision($user), $data['revision']), 409, 'تغيّر الحساب لدى مسؤول آخر. أعد فتحه وراجع التعديلات.');
            if (($user->is_active && ! $data['isActive']) || $user->role !== $data['role']) {
                $this->guardRemoval($user);
            }
            $this->validateLogin(trim($data['loginCode']), $user->id);
            $changes = [];
            foreach (['name' => 'full_name', 'loginCode' => 'login_code', 'role' => 'role', 'isActive' => 'is_active'] as $key => $column) {
                $value = is_string($data[$key]) ? trim($data[$key]) : $data[$key];
                if ($value !== $user->$column) {
                    $changes[] = ['label' => ['name' => 'الاسم', 'loginCode' => 'رقم الدخول', 'role' => 'الدور', 'isActive' => 'نشاط الحساب'][$key], 'before' => $user->$column, 'after' => $value];
                }
                $user->$column = $value;
            }
            if (! empty($data['password'])) {
                $user->password = Hash::make($data['password']);
                $changes[] = ['label' => 'كلمة المرور', 'after' => 'أُعيد تعيينها'];
            }
            if ($changes !== []) {
                $user->save();
                app(ManagedPasswordService::class)->remember($user, $data['password'] ?? null);
                $this->history->record('تعديل حساب', $user->full_name, $changes);
            }

            return $this->serialize($user);
        });
    }

    public function delete(string $accountId): void
    {
        DB::transaction(function () use ($accountId) {
            DB::table('departments')->where('id', DepartmentContext::id())->lockForUpdate()->first();
            if (! User::query()->where('department_id', DepartmentContext::id())->whereKey($accountId)
                ->whereIn('role', ['admin', 'male_manager', 'female_manager'])->exists()) {
                return;
            }
            $user = $this->account($accountId);
            $this->guardRemoval($user);
            $this->history->record('حذف حساب', $user->full_name);
            $user->delete();
        });
    }
}
