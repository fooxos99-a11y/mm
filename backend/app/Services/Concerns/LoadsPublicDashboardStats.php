<?php

namespace App\Services\Concerns;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

trait LoadsPublicDashboardStats
{
    public function loadPublicStats(): array
    {
        $baseStats = [
            'batches' => 32,
            'courses' => 274,
            'managerGraduates' => 24,
            'supervisorGraduates' => 35,
            'secretaryGraduates' => 27,
            'practitionerGraduates' => 1466,
            'licenseDetails' => [
                'manager' => ['graduates' => 24, 'batches' => 1, 'courses' => 7],
                'supervisor' => ['graduates' => 35, 'batches' => 1, 'courses' => 6],
                'secretary' => ['graduates' => 27, 'batches' => 1, 'courses' => 3],
                'practitioner' => ['graduates' => 1466, 'batches' => 29, 'courses' => 258],
            ],
        ];

        $graduatesCount = $baseStats['managerGraduates']
            + $baseStats['supervisorGraduates']
            + $baseStats['secretaryGraduates']
            + $baseStats['practitionerGraduates'];

        $satisfactionRate = 0;
        if (Schema::hasTable('satisfaction_responses')) {
            $row = DB::table('satisfaction_responses')
                ->whereNotNull('rating_value')
                ->selectRaw('SUM(rating_value) as total, COUNT(*) as cnt')
                ->first();
            if ($row && $row->cnt > 0) {
                $satisfactionRate = (int) round(($row->total / ($row->cnt * 10)) * 100);
            }
        }

        return [
            'graduates' => $graduatesCount,
            'satisfactionRate' => $satisfactionRate,
            'courses' => $baseStats['courses'],
            'batches' => $baseStats['batches'],
            'licenseDetails' => $baseStats['licenseDetails'],
            'graduateDetails' => [
                'manager' => $baseStats['managerGraduates'],
                'supervisor' => $baseStats['supervisorGraduates'],
                'secretary' => $baseStats['secretaryGraduates'],
                'practitioner' => $baseStats['practitionerGraduates'],
            ],
        ];
    }
}
