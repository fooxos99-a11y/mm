<?php

namespace Tests\Feature;

use App\Models\Reciter;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

class StudentAccessTest extends CoreDataApiTestCase
{
    public function test_student_flow_works(): void
    {
        $createResponse = $this->postJson('/api/students', [
            'name' => 'طالب جديد',
            'loginId' => '7001',
            'password' => 'Secure-password-1234',
            'passwordConfirmation' => 'Secure-password-1234',
            'branchId' => 'male',
            'note' => 'ملاحظة',
        ]);

        $studentId = $createResponse->json('id');

        $createResponse
            ->assertCreated()
            ->assertJsonPath('branchId', 'male')
            ->assertJsonPath('isCertified', false);

        $this->assertDatabaseHas('users', [
            'login_code' => '7001',
            'role' => 'student',
            'full_name' => 'طالب جديد',
        ]);

        $studentUser = User::query()->where('login_code', '7001')->first();
        $this->assertNotNull($studentUser);
        $this->assertFalse(Hash::check('7001', $studentUser->password));
        $this->assertTrue(Hash::check('Secure-password-1234', $studentUser->password));

        $this->putJson('/api/students/'.$studentId, [
            'name' => 'طالب محدث',
            'loginCode' => '7002',
            'isCertified' => true,
            'completedParts' => [1, 5, 5, 3],
        ])
            ->assertOk()
            ->assertJsonPath('name', 'طالب محدث')
            ->assertJsonPath('loginId', '7002')
            ->assertJsonPath('isCertified', true)
            ->assertJsonPath('completedParts.0', 1)
            ->assertJsonPath('completedParts.1', 3)
            ->assertJsonPath('completedParts.2', 5);

        $this->assertDatabaseMissing('users', [
            'login_code' => '7001',
            'role' => 'student',
        ]);

        $this->assertDatabaseHas('users', [
            'login_code' => '7002',
            'role' => 'student',
            'full_name' => 'طالب محدث',
        ]);

        $this->deleteJson('/api/students/'.$studentId)->assertNoContent();

        $this->assertDatabaseMissing('students', ['id' => $studentId]);
        $this->assertDatabaseMissing('users', ['login_code' => '7002', 'role' => 'student']);
    }

    public function test_student_snapshot_is_limited_to_the_authenticated_student(): void
    {
        $branchId = DB::table('branches')->where('code', 'male')->value('id');

        Student::query()->create([
            'full_name' => 'Own Student',
            'login_code' => '8101',
            'branch_id' => $branchId,
            'note' => 'own note',
        ]);

        Student::query()->create([
            'full_name' => 'Other Student',
            'login_code' => '8102',
            'branch_id' => $branchId,
            'note' => 'other note',
        ]);

        Sanctum::actingAs(User::factory()->create([
            'role' => 'student',
            'login_code' => '8101',
        ]));

        $this->getJson('/api/dashboard/snapshot')
            ->assertOk()
            ->assertJsonCount(1, 'students')
            ->assertJsonPath('students.0.loginId', '8101')
            ->assertJsonCount(0, 'reciters')
            ->assertJsonPath('rolePermissions', []);
    }

    public function test_student_cannot_use_admin_student_routes(): void
    {
        Sanctum::actingAs(User::factory()->create([
            'role' => 'student',
            'login_code' => '8103',
        ]));

        $this->postJson('/api/students', [
            'name' => 'Blocked Student',
            'loginId' => '8104',
            'password' => 'Secure-password-1234',
            'passwordConfirmation' => 'Secure-password-1234',
            'branchId' => 'male',
        ])->assertForbidden();
    }

    public function test_student_snapshot_never_exposes_assessment_answer_keys(): void
    {
        $branchId = DB::table('branches')->where('code', 'male')->value('id');
        $courseId = (string) Str::uuid();
        Student::query()->create([
            'full_name' => 'طالب آمن',
            'login_code' => '8111',
            'branch_id' => $branchId,
        ]);
        DB::table('courses')->insert([
            'id' => $courseId,
            'title' => 'اختبار الطالب',
            'created_at' => now(),
        ]);
        DB::table('course_questions')->insert([
            'id' => (string) Str::uuid(),
            'course_id' => $courseId,
            'assessment_type' => 'post',
            'question_type' => 'multiple',
            'prompt' => 'سؤال',
            'options' => json_encode(['أ', 'ب']),
            'correct_answer' => 'ب',
            'created_at' => now(),
        ]);

        Sanctum::actingAs(User::factory()->create(['role' => 'student', 'login_code' => '8111']));

        $this->getJson('/api/dashboard/snapshot')
            ->assertOk()
            ->assertJsonPath('courses.0.postQuestions.0.correctAnswer', '');
    }

    public function test_reciter_can_only_view_and_update_linked_students(): void
    {
        $branchId = DB::table('branches')->where('code', 'male')->value('id');

        $ownStudent = Student::query()->create([
            'full_name' => 'Linked Student',
            'login_code' => '8201',
            'branch_id' => $branchId,
            'note' => '',
        ]);
        $otherStudent = Student::query()->create([
            'full_name' => 'Other Student',
            'login_code' => '8202',
            'branch_id' => $branchId,
            'note' => '',
        ]);

        $ownUser = User::factory()->create(['role' => 'reciter', 'login_code' => '9301']);
        $otherUser = User::factory()->create(['role' => 'reciter', 'login_code' => '9302']);
        $ownReciter = Reciter::query()->create([
            'full_name' => 'Own Reciter',
            'user_id' => $ownUser->id,
            'branch_id' => $branchId,
        ]);
        Reciter::query()->create([
            'full_name' => 'Other Reciter',
            'user_id' => $otherUser->id,
            'branch_id' => $branchId,
        ]);
        $ownReciter->students()->attach($ownStudent->id);

        Sanctum::actingAs($ownUser);

        $this->getJson('/api/reciters/by-login/9302')->assertForbidden();

        $this->putJson("/api/students/{$otherStudent->id}/parts/1", [
            'reciterId' => $ownReciter->id,
            'shouldMarkComplete' => true,
        ])->assertForbidden();

        $this->putJson("/api/students/{$ownStudent->id}/parts/1", [
            'reciterId' => $ownReciter->id,
            'shouldMarkComplete' => true,
        ])->assertNoContent();
    }
}
