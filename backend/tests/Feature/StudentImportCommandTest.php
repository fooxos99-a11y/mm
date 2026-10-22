<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Support\DepartmentContext;
use Illuminate\Support\Facades\DB;

class StudentImportCommandTest extends CoreDataApiTestCase
{
    public function test_command_requires_exact_target_previews_applies_and_verifies_the_same_batch(): void
    {
        $file = tempnam(sys_get_temp_dir(), 'student-import-test-');
        file_put_contents($file, json_encode(['sourceHash' => str_repeat('b', 64), 'branchId' => 'male', 'entries' => [
            ['name' => 'طالب أمر الاستيراد', 'loginCode' => '0799', 'password' => '0799', 'sourceRow' => 2,
                'sourceFields' => [['label' => 'رقم السجل المدني', 'value' => '123'], ['label' => 'الإيميل', 'value' => '-']]],
        ]]));
        $target = ['--department' => DepartmentContext::DEFAULT_ID, '--department-name' => Department::find(DepartmentContext::DEFAULT_ID)->name];
        try {
            $this->artisan('students:import', ['--inspect' => true])->assertSuccessful();
            $this->artisan('students:import', ['file' => $file, '--department-name' => 'إدارة خاطئة'])->assertFailed();
            $this->artisan('students:import', [...$target, 'file' => $file, '--expected-count' => 2])->assertFailed();
            $this->artisan('students:import', [...$target, 'file' => $file, '--expected-count' => 1])->assertSuccessful();
            $this->assertDatabaseMissing('students', ['login_code' => '0799']);
            $this->artisan('students:import', [...$target, 'file' => $file, '--expected-count' => 1, '--apply' => true, '--expected-students' => 99])->assertFailed();
            $this->artisan('students:import', [...$target, 'file' => $file, '--expected-count' => 1, '--apply' => true, '--expected-students' => 0])->assertSuccessful();
            $batch = DB::table('student_import_batches')->first();
            $this->artisan('students:import', [...$target, '--verify' => $batch->id])->assertSuccessful();
            $this->artisan('students:import', [...$target, 'file' => $file, '--expected-count' => 1, '--apply' => true, '--expected-students' => 0])->assertSuccessful();
            $this->assertDatabaseCount('student_import_items', 1);
        } finally {
            unlink($file);
        }
    }
}
