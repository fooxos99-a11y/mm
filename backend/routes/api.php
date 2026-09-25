<?php

use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClientErrorController;
use App\Http\Controllers\Api\CourseAssessmentController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\DashboardAccountController;
use App\Http\Controllers\Api\DashboardDatasetController;
use App\Http\Controllers\Api\EditorAssetController;
use App\Http\Controllers\Api\FinalExamController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OperationalHealthController;
use App\Http\Controllers\Api\PageContentController;
use App\Http\Controllers\Api\PeopleDirectoryController;
use App\Http\Controllers\Api\ReciterController;
use App\Http\Controllers\Api\ResultsDirectoryController;
use App\Http\Controllers\Api\RolePermissionController;
use App\Http\Controllers\Api\SatisfactionController;
use App\Http\Controllers\Api\SnapshotController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\TaskTemplateController;
use App\Http\Controllers\Api\TrainingMaterialController;
use App\Http\Controllers\ArchiveController;
use App\Http\Controllers\CompletionRequirementsController;
use App\Http\Controllers\RegistrationController;
use Illuminate\Support\Facades\Route;

Route::get('health/operations', OperationalHealthController::class)->middleware('throttle:30,1');

Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::get('session', [AuthController::class, 'session']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('user', [AuthController::class, 'user']);
        Route::put('password', [AuthController::class, 'updatePassword'])
            ->middleware('throttle:password-change');
        Route::post('logout', [AuthController::class, 'logout']);
    });
});

Route::prefix('public')->group(function () {
    Route::get('snapshot', [SnapshotController::class, 'snapshot']);
    Route::get('stats', [SnapshotController::class, 'publicStats']);
    Route::get('registration', [RegistrationController::class, 'publicStatus']);
    Route::post('registration-requests', [RegistrationController::class, 'submit'])->middleware('throttle:5,1');

    Route::middleware(['auth:sanctum', 'password.changed'])->group(function () {
        Route::post('assessment-submissions', [CourseAssessmentController::class, 'store'])->middleware('throttle:10,1');
        Route::post('satisfaction-responses', [SatisfactionController::class, 'storeResponses'])->middleware('throttle:20,1');
        Route::post('final-exam/submissions', [FinalExamController::class, 'storeSubmission'])->middleware('throttle:10,1');
    });
});

Route::middleware(['auth:sanctum', 'password.changed'])->group(function () {
    Route::post('client-errors', ClientErrorController::class)->middleware('throttle:20,1');
    Route::get('training-material-attachments/{attachmentId}', [TrainingMaterialController::class, 'attachment']);
    Route::prefix('dashboard')->group(function () {
        Route::get('snapshot', [SnapshotController::class, 'snapshot']);
        Route::middleware('can:access-dashboard')->group(function () {
            Route::get('shell', [SnapshotController::class, 'shell']);
            Route::get('results/catalog', [ResultsDirectoryController::class, 'catalog'])->middleware('dashboard.access:results');
            Route::get('results', [ResultsDirectoryController::class, 'index'])->middleware('dashboard.access:results');
            Route::get('people', PeopleDirectoryController::class)->middleware('dashboard.access:people');
            Route::get('people/options', [PeopleDirectoryController::class, 'options'])->middleware('dashboard.access:people');
            Route::get('people/{type}/{id}', [PeopleDirectoryController::class, 'detail'])
                ->whereIn('type', ['student', 'reciter'])->middleware('dashboard.access:people');
            Route::post('editor-images', [EditorAssetController::class, 'store'])
                ->middleware('dashboard.access:editor-image');
            Route::post('task-templates', [TaskTemplateController::class, 'store'])
                ->middleware('dashboard.access:task-edit');
            Route::put('task-templates/{templateId}', [TaskTemplateController::class, 'update'])
                ->middleware('dashboard.access:task-edit');
            Route::post('manual-attendance', [AttendanceController::class, 'store'])
                ->middleware('dashboard.access:results');
            Route::post('assessment-submissions', [CourseAssessmentController::class, 'store'])
                ->middleware('dashboard.access:results');
            Route::post('assessment-import', [CourseAssessmentController::class, 'import'])
                ->middleware('dashboard.access:assessment-import');
            Route::post('satisfaction-questions', [SatisfactionController::class, 'storeQuestion'])
                ->middleware('dashboard.access:satisfaction');
            Route::delete('satisfaction-questions/{questionId}', [SatisfactionController::class, 'destroyQuestion'])
                ->middleware('dashboard.access:satisfaction');
            Route::post('satisfaction-responses', [SatisfactionController::class, 'storeResponses'])
                ->middleware('dashboard.access:satisfaction');
            Route::post('final-exam/questions', [FinalExamController::class, 'storeQuestion'])
                ->middleware('dashboard.access:final-exam');
            Route::put('final-exam/questions/{questionId}', [FinalExamController::class, 'updateQuestion'])
                ->middleware('dashboard.access:final-exam');
            Route::delete('final-exam/questions/{questionId}', [FinalExamController::class, 'destroyQuestion'])
                ->middleware('dashboard.access:final-exam');
            Route::put('final-exam/settings/{branchCode}', [FinalExamController::class, 'updateSetting'])
                ->middleware('dashboard.access:final-exam');
            Route::put('final-exam/settings/{branchCode}/notification-template', [FinalExamController::class, 'updateNotificationTemplate'])
                ->middleware('dashboard.access:final-exam');
            Route::post('final-exam/submissions', [FinalExamController::class, 'storeSubmission'])
                ->middleware('dashboard.access:final-exam');
            Route::post('final-exam/questions/copy', [FinalExamController::class, 'copyQuestions'])
                ->middleware('dashboard.access:final-exam');
            Route::put('final-exam/submissions/{submissionId}/manual-score', [FinalExamController::class, 'updateScore'])
                ->middleware('dashboard.access:results');
            Route::put('final-exam/submissions/{submissionId}/answers/{answerId}/manual-score', [FinalExamController::class, 'updateAnswerScore'])
                ->middleware('dashboard.access:results');
            Route::put('assessment-submissions/{submissionId}/manual-score', [CourseAssessmentController::class, 'updateScore'])
                ->middleware('dashboard.access:results');
            Route::put('assessment-submissions/{submissionId}/answers/{answerId}/manual-score', [CourseAssessmentController::class, 'updateAnswerScore'])
                ->middleware('dashboard.access:results');
            Route::put('assessment-submissions/{submissionId}/task-review', [CourseAssessmentController::class, 'reviewTask'])
                ->middleware('dashboard.access:results');
            Route::get('results/{dataset}', [DashboardDatasetController::class, 'index'])
                ->whereIn('dataset', ['submissions', 'attendance', 'satisfaction-responses', 'final-exam-submissions'])
                ->middleware('dashboard.access:results');
            Route::post('courses', [CourseController::class, 'store'])->middleware('dashboard.access:course-store');
            Route::put('courses/sort-order', [CourseController::class, 'updateSortOrder'])->middleware('dashboard.access:course-sort');
            Route::post('courses/deactivate-all', [CourseController::class, 'deactivateAll'])->middleware('dashboard.access:course-deactivate-all');
            Route::put('courses/{courseId}', [CourseController::class, 'update'])->middleware('dashboard.access:course-update');
            Route::delete('courses/{courseId}', [CourseController::class, 'destroy'])->middleware('dashboard.access:course-destroy');
            Route::post('courses/{courseId}/activate', [CourseController::class, 'activate'])->middleware('dashboard.access:course-activate');
            Route::post('courses/{courseId}/questions', [CourseController::class, 'storeQuestion'])->middleware('dashboard.access:course-question');
            Route::put('courses/{courseId}/questions/sync', [CourseController::class, 'syncQuestions'])->middleware('dashboard.access:course-question');
            Route::put('questions/{questionId}', [CourseController::class, 'updateQuestion'])->middleware('dashboard.access:course-question');
            Route::delete('questions/{questionId}', [CourseController::class, 'destroyQuestion'])->middleware('dashboard.access:course-question');
            Route::get('accounts', [DashboardAccountController::class, 'index'])->middleware('dashboard.access:admin');
            Route::post('accounts', [DashboardAccountController::class, 'store'])->middleware('dashboard.access:admin');
            Route::delete('accounts/{accountId}', [DashboardAccountController::class, 'destroy'])->middleware('dashboard.access:admin');
            Route::post('transfer-student', [StudentController::class, 'transfer'])->middleware('dashboard.access:transfer-student');
            Route::get('notifications', [NotificationController::class, 'index'])->middleware('dashboard.access:notifications');
            Route::post('notifications', [NotificationController::class, 'store'])->middleware('dashboard.access:notifications');
            Route::delete('notifications/{notificationId}', [NotificationController::class, 'destroy'])->middleware('dashboard.access:notifications');
            Route::get('training-materials', [TrainingMaterialController::class, 'index'])->middleware('dashboard.access:materials');
            Route::post('training-materials', [TrainingMaterialController::class, 'store'])->middleware('dashboard.access:materials');
            Route::put('training-materials/{materialId}', [TrainingMaterialController::class, 'update'])->middleware('dashboard.access:materials');
            Route::delete('training-materials/{materialId}', [TrainingMaterialController::class, 'destroy'])->middleware('dashboard.access:materials');
            Route::put('home-page-content', [PageContentController::class, 'updateHome'])->middleware('dashboard.access:admin');
            Route::put('practitioner-page-content', [PageContentController::class, 'updatePractitioner'])->middleware('dashboard.access:admin');
            Route::get('role-permissions', [RolePermissionController::class, 'index'])->middleware('dashboard.access:admin');
            Route::put('role-permissions', [RolePermissionController::class, 'update'])->middleware('dashboard.access:admin');
            Route::get('registration', [RegistrationController::class, 'index'])->middleware('dashboard.access:registration-view');
            Route::put('registration/settings', [RegistrationController::class, 'updateSettings'])->middleware('dashboard.access:registration-update');
            Route::put('registration/fields', [RegistrationController::class, 'updateFields'])->middleware('dashboard.access:registration-update');
            Route::post('registration-requests/{requestId}/accept', [RegistrationController::class, 'accept'])->middleware('dashboard.access:registration-accept');
            Route::post('registration-requests/{requestId}/reject', [RegistrationController::class, 'reject'])->middleware('dashboard.access:registration-update');
            Route::post('registration-requests/{requestId}/mark-accepted', [RegistrationController::class, 'markAccepted'])->middleware('dashboard.access:registration-update');
            Route::get('completion-requirements/{branchCode}', [CompletionRequirementsController::class, 'show'])->middleware('dashboard.access:completion-view');
            Route::put('completion-requirements/{branchCode}', [CompletionRequirementsController::class, 'update'])->middleware('dashboard.access:completion-update');
            Route::post('completion-requirements/{branchCode}/close', [CompletionRequirementsController::class, 'close'])->middleware('dashboard.access:completion-close');
            Route::post('completion-requirements/{branchCode}/reopen', [CompletionRequirementsController::class, 'reopen'])->middleware('dashboard.access:completion-close');

            Route::get('archives', [ArchiveController::class, 'index'])->middleware('dashboard.access:admin');
            Route::post('archives', [ArchiveController::class, 'store'])->middleware('dashboard.access:admin');
            Route::get('archives/search/students', [ArchiveController::class, 'searchStudents'])->middleware('dashboard.access:admin');
            Route::get('archives/{archiveId}', [ArchiveController::class, 'show'])->middleware('dashboard.access:admin');
            Route::delete('archives/{archiveId}', [ArchiveController::class, 'destroy'])->middleware('dashboard.access:admin');
            Route::get('archives/{archiveId}/students/{studentId}', [ArchiveController::class, 'studentDetail'])->middleware('dashboard.access:admin');
            Route::post('archives/{archiveId}/students', [ArchiveController::class, 'assignStudent'])->middleware('dashboard.access:admin');
            Route::post('archives/archive-all', [ArchiveController::class, 'archiveAll'])->middleware('dashboard.access:admin');
        });
    });

    Route::prefix('students')->group(function () {
        Route::get('me/indicators', [StudentController::class, 'indicators']);
        Route::middleware('can:access-dashboard')->group(function () {
            Route::post('/', [StudentController::class, 'store'])->middleware('dashboard.access:student-add');
            Route::put('{student}', [StudentController::class, 'update'])->middleware('dashboard.access:student-edit');
            Route::delete('{student}', [StudentController::class, 'destroy'])->middleware('dashboard.access:student-delete');
        });
        Route::get('by-login/{loginCode}/assigned-reciter', [ReciterController::class, 'assignedToStudent']);
        Route::put('{student}/parts/{partNumber}', [StudentController::class, 'togglePart']);
    });

    Route::prefix('reciters')->group(function () {
        Route::post('/', [ReciterController::class, 'store'])->middleware(['can:access-dashboard', 'dashboard.access:reciter-store']);
        Route::get('by-login/{loginCode}', [ReciterController::class, 'show']);
        Route::delete('by-login/{loginCode}', [ReciterController::class, 'destroy'])->middleware(['can:access-dashboard', 'dashboard.access:reciter-delete']);
    });
});
