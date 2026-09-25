<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\CourseAssessmentController;
use App\Http\Controllers\Api\DashboardAccountController;
use App\Http\Controllers\Api\EditorAssetController;
use App\Http\Controllers\Api\FinalExamController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PageContentController;
use App\Http\Controllers\Api\ReciterController;
use App\Http\Controllers\Api\RolePermissionController;
use App\Http\Controllers\Api\SatisfactionController;
use App\Http\Controllers\Api\SnapshotController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\TaskTemplateController;
use App\Http\Controllers\Api\TrainingMaterialController;
use App\Http\Controllers\ArchiveController;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ControllerArchitectureContractTest extends TestCase
{
    public function test_api_routes_use_the_split_controllers(): void
    {
        $actions = collect(Route::getRoutes()->getRoutes())
            ->filter(fn ($route): bool => str_starts_with($route->uri(), 'api/'))
            ->map(fn ($route): string => $route->getActionName());

        $this->assertFalse($actions->contains(fn (string $action): bool => str_starts_with($action, 'App\\Http\\Controllers\\Api\\CoreDataController@')));
        $this->assertFalse($actions->contains(fn (string $action): bool => str_starts_with($action, 'App\\Http\\Controllers\\Api\\AssessmentController@')));

        foreach ($this->splitControllers() as $controller) {
            $this->assertTrue(
                $actions->contains(fn (string $action): bool => str_starts_with($action, $controller.'@')),
                $controller,
            );
        }
    }

    public function test_split_controllers_do_not_query_the_database_directly(): void
    {
        foreach ([ArchiveController::class, ...$this->splitControllers()] as $controller) {
            $source = file_get_contents((new \ReflectionClass($controller))->getFileName());

            $this->assertStringNotContainsString('Facades\\DB', $source, $controller);
            $this->assertStringNotContainsString('::query()', $source, $controller);
        }
    }

    private function splitControllers(): array
    {
        return [
            AttendanceController::class,
            CourseAssessmentController::class,
            DashboardAccountController::class,
            EditorAssetController::class,
            FinalExamController::class,
            NotificationController::class,
            PageContentController::class,
            ReciterController::class,
            RolePermissionController::class,
            SatisfactionController::class,
            SnapshotController::class,
            StudentController::class,
            TaskTemplateController::class,
            TrainingMaterialController::class,
        ];
    }
}
