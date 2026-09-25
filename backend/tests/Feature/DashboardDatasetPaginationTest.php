<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\CoreDataService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardDatasetPaginationTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_results_are_paginated_and_page_size_is_bounded(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $courseId = (string) Str::uuid();
        DB::table('courses')->insert([
            'id' => $courseId,
            'title' => 'Pagination course',
            'created_at' => now(),
        ]);

        DB::table('course_submissions')->insert(collect(range(1, 105))->map(fn (int $index) => [
            'id' => (string) Str::uuid(),
            'course_id' => $courseId,
            'assessment_type' => 'pre',
            'student_name' => "Student {$index}",
            'login_code' => "pagination-{$index}",
            'submitted_at' => now()->subSeconds($index),
        ])->all());

        $this->getJson('/api/dashboard/results/submissions?perPage=25&page=2')
            ->assertOk()
            ->assertJsonCount(25, 'data')
            ->assertJsonPath('current_page', 2)
            ->assertJsonPath('per_page', 25)
            ->assertJsonPath('total', 105)
            ->assertJsonPath('last_page', 5);

        $this->getJson('/api/dashboard/results/submissions?perPage=101')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('perPage');

        $this->getJson('/api/dashboard/results/submissions?perPage=100&courseId='.$courseId.'&assessmentType=post')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('total', 0);
    }

    public function test_complete_snapshot_is_not_limited_to_the_interactive_snapshot_cap(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $courseId = (string) Str::uuid();
        DB::table('courses')->insert([
            'id' => $courseId,
            'title' => 'Complete snapshot course',
            'created_at' => now(),
        ]);

        collect(range(1, 1001))->chunk(100)->each(function ($indexes) use ($courseId): void {
            DB::table('course_submissions')->insert($indexes->map(fn (int $index) => [
                'id' => (string) Str::uuid(),
                'course_id' => $courseId,
                'assessment_type' => 'pre',
                'student_name' => "Snapshot Student {$index}",
                'login_code' => "snapshot-{$index}",
                'submitted_at' => now()->subSeconds($index),
            ])->all());
        });

        $snapshot = app(CoreDataService::class)->loadDashboardSnapshot(true);

        $this->assertCount(1001, $snapshot['submissions']);
        $this->assertSame(1001, $snapshot['snapshotMeta']['submissions']['returned']);
        $this->assertFalse($snapshot['snapshotMeta']['submissions']['truncated']);

        $first = $this->getJson('/api/dashboard/snapshot?page=1')->assertOk()
            ->assertJsonCount(1000, 'submissions')->assertJsonPath('snapshotMeta.submissions.nextPage', 2)->json();
        $second = $this->getJson('/api/dashboard/snapshot?page=2')->assertOk()
            ->assertJsonCount(1, 'submissions')->assertJsonPath('snapshotMeta.submissions.nextPage', null)->json();
        $this->assertNotContains($second['submissions'][0]['id'], array_column($first['submissions'], 'id'));
        $this->getJson('/api/dashboard/snapshot?page=0')->assertUnprocessable();
    }
}
