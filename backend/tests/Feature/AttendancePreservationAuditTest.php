<?php

namespace Tests\Feature;

use App\Support\DepartmentContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AttendancePreservationAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_audit_preserves_legacy_records_without_disclosing_names_and_rejects_loss_or_changes(): void
    {
        require_once base_path('../scripts/audit-attendance-preservation.php');
        $course = (string) str()->uuid();
        $id = (string) str()->uuid();
        DB::table('courses')->insert(['id' => $course, 'department_id' => DepartmentContext::id(), 'title' => 'التجويد والقرآن', 'created_at' => now()]);
        DB::table('course_attendance')->insert(['id' => $id, 'department_id' => DepartmentContext::id(),
            'course_id' => $course, 'student_name' => 'اسم خاص لا يظهر', 'login_code' => 'private-code',
            'source' => 'manual', 'created_at' => now()]);
        $before = attendancePreservationSnapshot(DB::connection());
        $this->assertSame(1, $before['courses'][0]['present']);
        $this->assertSame(1, $before['courses'][0]['legacyRecords']);
        $this->assertStringNotContainsString('private-code', json_encode($before));
        $this->assertStringNotContainsString('اسم خاص لا يظهر', json_encode($before, JSON_UNESCAPED_UNICODE));
        $this->assertTrue(compareAttendancePreservation($before, attendancePreservationSnapshot(DB::connection()))['preserved']);
        foreach ([['records' => []], ['records' => [$id => 'changed']], []] as $invalid) {
            try {
                compareAttendancePreservation($before, $invalid);
                $this->fail('Changed or missing attendance must stop activation.');
            } catch (\RuntimeException) {
                $this->assertTrue(true);
            }
        }
        $this->assertDatabaseHas('course_attendance', ['id' => $id, 'login_code' => 'private-code', 'session_id' => null, 'hours' => null]);
    }
}
