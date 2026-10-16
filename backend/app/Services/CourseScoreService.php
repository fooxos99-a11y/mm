<?php

namespace App\Services;

use App\Models\User;
use App\Support\DepartmentContext;
use App\Support\DepartmentData as DB;
use Illuminate\Validation\ValidationException;

class CourseScoreService
{
    public function __construct(private readonly DashboardCommunicationService $communication)
    {
    }

    public function save(User $user, array $data): array
    {
        abort_unless(in_array(DepartmentContext::effectiveRole((string) $user->role), ['admin', 'male_manager', 'female_manager'], true), 403);
        abort_if(DepartmentContext::effectiveRole((string) $user->role) !== 'admin'
            && $data['branchCode'] !== (DepartmentContext::effectiveRole((string) $user->role) === 'female_manager' ? 'female' : 'male'), 403);

        $saved = DB::transaction(function () use ($user, $data): int {
            // Serialize writes in this course, including the first score setting and absent grade rows.
            $course = DB::table('courses')->where('id', $data['courseId'])->whereNull('archive_id')
                ->lockForUpdate()->first();
            abort_unless($course && $course->entity_type !== 'task', 422, 'الدورة المحددة غير متاحة.');
            $students = DB::table('students')->join('branches', 'branches.id', '=', 'students.branch_id')
                ->whereNull('students.archive_id')->where('branches.code', $data['branchCode'])
                ->whereIn('students.id', array_column($data['grades'], 'studentId'))
                ->select('students.id')->lockForUpdate()->get()->keyBy('id');
            abort_unless($students->count() === count($data['grades']), 422, 'توجد أسماء لا تتبع الفرع المحدد.');
            $setting = DB::table('course_score_settings')->where('course_id', $data['courseId'])
                ->where('assessment_type', $data['assessmentType'])->where('branch_code', $data['branchCode'])
                ->lockForUpdate()->first();
            $questionTotal = (float) DB::table('course_questions')->where('course_id', $data['courseId'])
                ->where('assessment_type', $data['assessmentType'])->whereNull('archive_id')
                ->whereNull('deleted_at')->sum('points');
            $total = $setting ? (float) $setting->total_points : ($questionTotal > 0 ? $questionTotal : (float) $data['totalPoints']);
            if (abs($total - (float) $data['totalPoints']) > 0.00001) {
                throw ValidationException::withMessages(['totalPoints' => 'الدرجة الكاملة تغيّرت. أعد تحميل الدرجات.']);
            }
            $existing = $setting ? DB::table('course_manual_scores')->where('setting_id', $setting->id)
                ->whereIn('student_id', $students->keys())->lockForUpdate()->get()->keyBy('student_id') : collect();
            foreach ($data['grades'] as $index => $grade) {
                if ($grade['score'] !== null && (float) $grade['score'] > $total) {
                    throw ValidationException::withMessages([
                        "grades.$index.score" => 'يجب أن تساوي درجة الاختبار درجة الطالب أو تزيد عليها.',
                    ]);
                }
                abort_if(($existing->get($grade['studentId'])?->version) !== $grade['expectedVersion'], 409,
                    'تغيّرت بعض الدرجات أثناء التعديل. حدّث الدرجات الحالية ثم راجع تعديلاتك.');
            }
            $settingId = $setting?->id ?? (string) str()->uuid();
            if (! $setting) {
                DB::table('course_score_settings')->insert(['id' => $settingId, 'course_id' => $data['courseId'],
                    'assessment_type' => $data['assessmentType'], 'branch_code' => $data['branchCode'],
                    'total_points' => $total]);
            }
            $count = 0;
            foreach ($data['grades'] as $grade) {
                $previous = $existing->get($grade['studentId']);
                $score = $grade['score'] === null ? null : (float) $grade['score'];
                if ($previous && ($previous->score === null ? null : (float) $previous->score) === $score) {
                    continue;
                }
                $id = $previous?->id ?? (string) str()->uuid();
                $values = ['score' => $score, 'version' => (string) str()->uuid(),
                    'updated_by' => $user->id, 'updated_at' => now()];
                if ($previous) {
                    DB::table('course_manual_scores')->where('id', $id)->update($values);
                } else {
                    DB::table('course_manual_scores')->insert([...$values, 'id' => $id, 'setting_id' => $settingId,
                        'student_id' => $grade['studentId'], 'created_at' => now()]);
                }
                DB::table('course_score_history')->insert(['id' => (string) str()->uuid(), 'score_id' => $id,
                    'previous_score' => $previous?->score, 'new_score' => $score,
                    'changed_by' => $user->id, 'created_at' => now()]);
                $count++;
            }

            return $count;
        });
        $this->communication->clearCaches();

        return ['saved' => $saved];
    }
}
