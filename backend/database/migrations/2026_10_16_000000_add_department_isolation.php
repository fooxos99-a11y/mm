<?php

use App\Support\DepartmentContext;
use App\Support\DepartmentData;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const SETTINGS = [
        'final_exam_settings' => ['branch_code'],
        'role_permissions' => ['role', 'permission_key'],
        'registration_settings' => ['key'],
        'app_settings' => ['setting_key'],
        'completion_requirement_settings' => ['branch_code'],
    ];

    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->foreignUuid('manager_user_id')->nullable()->unique()->constrained('users')->nullOnDelete();
            $table->string('manager_title')->default('مدير الإدارة');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        DB::table('departments')->insert([
            'id' => DepartmentContext::DEFAULT_ID,
            'name' => 'الإدارة الحالية',
            'manager_title' => 'مدير النمو المهني',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach (DepartmentData::TABLES as $tableName) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName): void {
                $column = $table->uuid('department_id')->default(DepartmentContext::DEFAULT_ID);
                if ($tableName === 'users') {
                    $column->nullable();
                }
                $table->index('department_id', $tableName.'_department_idx');
                $table->foreign('department_id', $tableName.'_department_fk')->references('id')->on('departments')->restrictOnDelete();
            });

            // Explicit backfill also covers database engines which add nullable/default columns differently.
            DB::table($tableName)->whereNull('department_id')->update(['department_id' => DepartmentContext::DEFAULT_ID]);
        }

        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('is_active')->default(true);
        });

        foreach (self::SETTINGS as $tableName => $columns) {
            Schema::table($tableName, function (Blueprint $table) use ($columns): void {
                $table->dropPrimary();
                $table->primary(['department_id', ...$columns]);
            });
        }

        Schema::table('archives', function (Blueprint $table): void {
            $table->dropUnique('archives_name_unique');
            $table->unique(['department_id', 'name'], 'archives_department_name_unique');
        });
        Schema::table('satisfaction_templates', function (Blueprint $table): void {
            $table->dropUnique('satisfaction_templates_identity_key_unique');
            $table->unique(['department_id', 'identity_key'], 'satisfaction_templates_department_identity_unique');
        });

        Schema::create('reserved_login_codes', function (Blueprint $table): void {
            $table->string('login_code')->primary();
            // Intentionally no foreign key: the reservation survives account deletion.
            $table->uuid('user_id')->nullable()->index();
            $table->timestamp('created_at')->useCurrent();
        });

        DB::table('users')->whereNotNull('login_code')->orderBy('id')->chunk(500, function ($users): void {
            foreach ($users as $user) {
                $this->reserve($user->login_code, $user->id);
            }
        });
        DB::table('students')->orderBy('id')->chunk(500, function ($students): void {
            foreach ($students as $student) {
                $this->reserve($student->login_code);
                $this->reserve($student->archived_login_code);
            }
        });
    }

    public function down(): void
    {
        // Multiple departments cannot safely be squeezed back into global setting keys.
        if (DB::table('departments')->where('id', '!=', DepartmentContext::DEFAULT_ID)->exists()) {
            throw new RuntimeException('Remove or export additional departments before reverting department isolation.');
        }

        Schema::dropIfExists('reserved_login_codes');
        Schema::table('archives', function (Blueprint $table): void {
            $table->dropUnique('archives_department_name_unique');
            $table->unique('name');
        });
        Schema::table('satisfaction_templates', function (Blueprint $table): void {
            $table->dropUnique('satisfaction_templates_department_identity_unique');
            $table->unique('identity_key');
        });

        foreach (self::SETTINGS as $tableName => $columns) {
            Schema::table($tableName, function (Blueprint $table) use ($columns): void {
                $table->dropPrimary();
                $table->primary($columns);
            });
        }

        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('is_active'));
        foreach (array_reverse(DepartmentData::TABLES) as $tableName) {
            if (Schema::hasColumn($tableName, 'department_id')) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName): void {
                    $table->dropForeign(Schema::getConnection()->getDriverName() === 'sqlite'
                        ? ['department_id'] : $tableName.'_department_fk');
                    $table->dropIndex($tableName.'_department_idx');
                    $table->dropColumn('department_id');
                });
            }
        }
        Schema::dropIfExists('departments');
    }

    private function reserve(?string $loginCode, ?string $userId = null): void
    {
        if (trim((string) $loginCode) !== '') {
            DB::table('reserved_login_codes')->insertOrIgnore([
                'login_code' => trim($loginCode),
                'user_id' => $userId,
                'created_at' => now(),
            ]);
        }
    }
};
