<?php

namespace App\Services;

use App\Models\Reciter;
use App\Models\Student;

class PeopleDirectoryPresenter
{
    public function __construct(private readonly RegistrationService $registrationService) {}

    public function student(Student $student, object $counts, array $totals): array
    {
        $labels = ['parts' => 'الأجزاء', 'attendance' => 'الحضور', 'pre' => 'القبلي', 'post' => 'البعدي', 'tasks' => 'المهام الأدائية'];
        $metrics = [];
        foreach ($labels as $key => $label) {
            $progress = min(100, (int) round(100 * $counts->{$key.'_count'} / $totals[$key]));
            $metrics[] = ['key' => $key, 'label' => $label, 'display' => $progress.'%', 'progressWidth' => $progress.'%'];
        }
        $overall = (int) $counts->overall_progress;
        $metrics[] = ['key' => 'overall', 'label' => 'الإجمالي', 'display' => $overall.'%', 'progressWidth' => $overall.'%'];

        return [
            'id' => $student->id, 'cardKey' => 'student:'.$student->id, 'name' => $student->full_name,
            'loginId' => $student->login_code, 'branchId' => $student->branch->code, 'note' => $student->note,
            'isCertified' => $student->is_certified, 'completedParts' => $student->parts->pluck('part_number')->all(),
            'reciterName' => $student->reciters->first()?->full_name ?: 'غير مرتبط',
            'overallProgress' => $overall, 'metrics' => $metrics,
            'registrationProfile' => $this->registrationService->serializeStudentRegistrationProfile($student->registrationRequest),
        ];
    }

    public function reciter(Reciter $reciter): array
    {
        return [
            'id' => $reciter->id, 'cardKey' => 'reciter:'.$reciter->id,
            'name' => $reciter->full_name ?: $reciter->user?->full_name,
            'loginId' => $reciter->user?->login_code ?: 'بدون رقم', 'loginCode' => $reciter->user?->login_code,
            'branchId' => $reciter->branch->code, 'studentIds' => $reciter->students->pluck('id')->all(),
            'linkedStudentNames' => $reciter->students->pluck('full_name')->sort()->implode('، ') ?: 'لا يوجد',
        ];
    }
}
