<?php

namespace App\Services;

use App\Models\User;
use App\Support\DepartmentContext;
use App\Support\DepartmentData as DB;
use App\Support\Security\PermissionCatalog;

class DashboardShellService
{
    public function __construct(private readonly DashboardOverviewService $overview)
    {
    }

    public function load(User $user): array
    {
        $branches = match (DepartmentContext::effectiveRole((string) $user->role)) {
            'admin' => ['male', 'female'], 'male_manager' => ['male'], 'female_manager' => ['female'],
            default => abort(403),
        };
        $permissions = PermissionCatalog::forRole(DepartmentContext::effectiveRole((string) $user->role));
        $indicators = [];
        if (DepartmentContext::effectiveRole((string) $user->role) === 'admin' || ($permissions['page_overview'] ?? false)) {
            $all = [];
            foreach ($branches as $branch) {
                $totals = $this->overview->totals($branch);
                $indicators[$branch] = $this->overview->indicators($totals);
                foreach ($totals as $key => [$count, $total]) {
                    $all[$key] = [($all[$key][0] ?? 0) + $count, ($all[$key][1] ?? 0) + $total];
                }
            }
            if (DepartmentContext::effectiveRole((string) $user->role) === 'admin') {
                $indicators['all'] = $this->overview->indicators($all);
            }
        }

        return ['snapshotMode' => 'shell', 'rolePermissions' => [DepartmentContext::effectiveRole((string) $user->role) => $permissions],
            'overviewIndicators' => $indicators,
            'branches' => DB::table('branches')->whereIn('code', $branches)->get(['code', 'name'])
                ->map(fn ($branch) => ['id' => $branch->code, 'label' => $branch->name])->all()];
    }
}
