<?php

namespace App\Services;

use App\Models\Reciter;
use App\Models\Student;
use App\Models\User;
use App\Support\DepartmentContext;
use App\Support\DepartmentData as DB;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\Storage;

final class AssessmentAttachmentAccessService
{
    public function authorizedPath(?User $user, string $reference): string
    {
        abort_unless($user, 401);
        $path = base64_decode(strtr($reference, '-_', '+/'), true);
        abort_unless(is_string($path) && $path !== '' && ! str_contains($path, '..')
            && ! str_starts_with($path, '/') && ! str_contains($path, '\\') && ! str_contains($path, "\0"), 404);
        $role = DepartmentContext::effectiveRole($user->role);
        abort_unless($this->hasQuestionAttachment($path, $role, $user) || $this->hasAnswerAttachment($path, $role, $user), 404);
        $disk = Storage::disk(config('filesystems.assessment_disk', 'local'));
        abort_unless($disk->exists($path), 404);

        return $disk->path($path);
    }

    private function hasQuestionAttachment(string $path, string $role, User $user): bool
    {
        foreach (['course_questions', 'final_exam_questions'] as $table) {
            $query = DB::table($table)->where('attachment_path', $path);
            if ($table === 'final_exam_questions' && $role !== 'admin') {
                $branch = $this->questionBranch($role, $user);
                if ($branch === null) {
                    continue;
                }
                $query->where('branch_code', $branch);
            }
            if ($query->exists()) {
                return true;
            }
        }

        return false;
    }

    private function questionBranch(string $role, User $user): ?string
    {
        if (in_array($role, ['male_manager', 'female_manager'], true)) {
            return $role === 'female_manager' ? 'female' : 'male';
        }
        if (in_array($role, ['student', 'trainee'], true)) {
            return Student::query()->where('login_code', $user->login_code)->first()?->branch?->code;
        }
        if ($role === 'reciter') {
            return Reciter::query()->where('user_id', $user->id)->first()?->branch?->code;
        }

        return null;
    }

    private function hasAnswerAttachment(string $path, string $role, User $user): bool
    {
        foreach (['course', 'final_exam'] as $prefix) {
            $answers = $prefix === 'course' ? 'course_submission_answers' : 'final_exam_submission_answers';
            $submissions = $prefix === 'course' ? 'course_submissions' : 'final_exam_submissions';
            $query = DB::table($answers)->join($submissions, $submissions.'.id', '=', $answers.'.submission_id')
                ->where($answers.'.file_path', $path);
            if (! $this->limitAnswersToUser($query, $submissions, $role, $user)) {
                continue;
            }
            if ($query->exists()) {
                return true;
            }
        }

        return false;
    }

    private function limitAnswersToUser(Builder $query, string $submissions, string $role, User $user): bool
    {
        if (in_array($role, ['student', 'trainee'], true)) {
            $query->where($submissions.'.login_code', $user->login_code);
        } elseif (in_array($role, ['male_manager', 'female_manager'], true)) {
            $query->join('students', 'students.login_code', '=', $submissions.'.login_code')
                ->join('branches', 'branches.id', '=', 'students.branch_id')
                ->where('branches.code', $role === 'female_manager' ? 'female' : 'male');
        } elseif ($role === 'reciter') {
            $reciter = Reciter::query()->where('user_id', $user->id)->first();
            $logins = $reciter?->students()->pluck('students.login_code')->all() ?? [];
            $query->whereIn($submissions.'.login_code', $logins);
        } elseif ($role !== 'admin') {
            return false;
        }

        return true;
    }
}
