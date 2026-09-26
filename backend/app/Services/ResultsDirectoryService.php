<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class ResultsDirectoryService
{
    public function __construct(private readonly CoreDataService $core)
    {
    }

    public function catalog(): array
    {
        return DB::table('courses')
            ->whereNull('archive_id')
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['id', 'title', 'entity_type', 'task_mode'])->map(fn ($course) => [
                'id' => $course->id, 'title' => $course->title, 'entityType' => $course->entity_type,
                'taskMode' => $course->task_mode,
            ])->all();
    }

    public function paginate(User $user, array $filters): array
    {
        $branch = $filters['branchCode'];
        abort_unless(in_array($user->role, ['admin', 'male_manager', 'female_manager'], true), 403);
        abort_if($user->role !== 'admin' && $branch !== ($user->role === 'female_manager' ? 'female' : 'male'), 403);
        $type = $filters['assessmentType'];
        $courseId = $filters['courseId'] ?? '';
        $courses = collect();
        if ($type !== 'final') {
            $course = DB::table('courses')->whereNull('archive_id')->where('id', $courseId)->first();
            abort_unless(
                $course && ($type === 'tasks') === ($course->entity_type === 'task'),
                422,
                'القسم المحدد غير متاح لهذا النوع من البيانات.'
            );
            $courses = collect([$course]);
        }
        $students = DB::table('students')->join('branches', 'branches.id', '=', 'students.branch_id')
            ->whereNull('students.archive_id')->where('branches.code', $branch);
        $eligibleCourses = DB::table('courses')->whereNull('archive_id')->where('entity_type', '!=', 'task');
        $present = DB::table('course_attendance')->whereNull('archive_id')
            ->whereColumn('login_code', 'students.login_code')->where('course_id', $courseId);
        $summary = null;
        if ($type === 'attendance') {
            $total = (clone $students)->count();
            $presentCount = (clone $students)->whereExists($present)->count();
            $summary = ['present' => $presentCount, 'absent' => $total - $presentCount];
        }
        $attendedCount = DB::table('course_attendance')->whereNull('archive_id')
            ->whereColumn('login_code', 'students.login_code')
            ->whereIn('course_id', (clone $eligibleCourses)->select('id'))
            ->selectRaw('COUNT(DISTINCT course_id)');
        $courseCount = $eligibleCourses->count();
        if (($filters['search'] ?? '') !== '') {
            $search = '%'.trim($filters['search']).'%';
            $students->where(
                fn ($query) => $query->where('students.full_name', 'like', $search)
                    ->orWhere('students.login_code', 'like', $search)
            );
        }
        $students->select('students.id', 'students.full_name', 'students.login_code')
            ->selectSub($attendedCount, 'attended_count');
        if ($type === 'attendance') {
            match ($filters['state'] ?? 'all') {
                'present' => $students->whereExists($present),
                'absent' => $students->whereNotExists($present),
                'absent3plus' => $students->where($attendedCount, '<=', $courseCount - 3),
                default => null,
            };
        }
        $page = $students->orderBy('students.full_name')
            ->orderBy('students.id')
            ->paginate((int) ($filters['perPage'] ?? 20));
        $logins = $page->getCollection()->pluck('login_code');
        $questions = $type !== 'final' && $type !== 'attendance'
            ? DB::table('course_questions')->whereNull('archive_id')->where(
                'course_id',
                $courseId
            )->where('assessment_type', $type)->orderBy('sort_order')->orderBy('id')->get()
            : collect();
        $submissions = in_array($type, ['pre', 'post', 'tasks'], true)
            ? DB::table('course_submissions')->whereNull('archive_id')->where(
                'course_id',
                $courseId
            )->where('assessment_type', $type)
                ->whereIn('login_code', $logins)->orderByDesc('submitted_at')->orderByDesc('id')->get() : collect();
        $attendance = $type === 'attendance' ? DB::table('course_attendance')->whereNull('archive_id')
            ->where('course_id', $courseId)->whereIn('login_code', $logins)->get() : collect();
        $finalQuestions = $type === 'final' ? DB::table('final_exam_questions')->whereNull('archive_id')
            ->where('branch_code', $branch)->orderBy('sort_order')->orderBy('id')->get() : collect();
        $finalSubmissions = $type === 'final' ? DB::table('final_exam_submissions')->whereNull('archive_id')
            ->where('branch_code', $branch)
            ->whereIn('login_code', $logins)
            ->orderByDesc('submitted_at')
            ->orderByDesc('id')
            ->get() : collect();
        $permissions = $this->core->loadRolePermissions()[$user->role] ?? [];
        $courseKeys = $user->role === 'admin' || collect(['edit_pre_questions', 'edit_post_questions', 'edit_tasks'])
            ->contains(fn ($key) => (bool) ($permissions[$key] ?? false));
        $data = $this->core->serializeResultsPage(
            $courses,
            $questions,
            $submissions,
            DB::table('course_submission_answers')
                ->whereNull('archive_id')
                ->whereIn('submission_id', $submissions->pluck('id'))
                ->get(),
            $attendance,
            $finalQuestions,
            $finalSubmissions,
            DB::table('final_exam_submission_answers')
                ->whereNull('archive_id')
                ->whereIn('submission_id', $finalSubmissions->pluck('id'))
                ->get(),
            $courseKeys,
            $user->role === 'admin' || ($permissions['page_final_exam'] ?? false),
        );

        return [...$data, 'students' => $page->getCollection()->map(fn ($student) => [
            'id' => $student->id, 'name' => $student->full_name, 'loginId' => $student->login_code,
            'branchId' => $branch, 'absenceCount' => $courseCount - (int) $student->attended_count,
        ])->all(), 'summary' => $summary,
            'pagination' => ['page' => $page->currentPage(), 'pages' => $page->lastPage(), 'total' => $page->total()]];
    }
}
