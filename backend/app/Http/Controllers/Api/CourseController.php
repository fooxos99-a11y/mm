<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Course\ActivateCourseRequest;
use App\Http\Requests\Course\SortCoursesRequest;
use App\Http\Requests\Course\StoreCourseQuestionRequest;
use App\Http\Requests\Course\StoreCourseRequest;
use App\Http\Requests\Course\SyncCourseQuestionsRequest;
use App\Http\Requests\Course\UpdateCourseQuestionRequest;
use App\Http\Requests\Course\UpdateCourseRequest;
use App\Services\CourseManagementService;
use Illuminate\Http\JsonResponse;

class CourseController extends Controller
{
    public function __construct(private readonly CourseManagementService $courseManagementService)
    {
    }

    public function store(StoreCourseRequest $request): JsonResponse
    {
        $data = $request->validated();

        return response()->json(
            $this->courseManagementService->createCourse($data['title'], (bool) ($data['isActive'] ?? false), $data),
            201,
        );
    }

    public function update(UpdateCourseRequest $request, string $courseId): JsonResponse
    {
        $data = $request->validated();

        $this->courseManagementService->updateCourse($courseId, $data);

        return response()->json(status: 204);
    }

    public function destroy(string $courseId): JsonResponse
    {
        $this->courseManagementService->deleteCourse($courseId);

        return response()->json(status: 204);
    }

    public function updateSortOrder(SortCoursesRequest $request): JsonResponse
    {
        $data = $request->validated();

        $this->courseManagementService->updateCoursesSortOrder($data['orderedIds']);

        return response()->json(status: 204);
    }

    public function activate(ActivateCourseRequest $request, string $courseId): JsonResponse
    {
        $data = $request->validated();

        $this->courseManagementService->activateCourse($courseId, $data === [] ? null : $data);

        return response()->json(status: 204);
    }

    public function deactivateAll(): JsonResponse
    {
        $this->courseManagementService->deactivateAllCourses();

        return response()->json(status: 204);
    }

    public function storeQuestion(StoreCourseQuestionRequest $request, string $courseId): JsonResponse
    {
        $data = $request->validated();

        return response()->json([
            'id' => $this->courseManagementService->addCourseQuestion($courseId, $data['assessmentType'], $data),
        ], 201);
    }

    public function updateQuestion(UpdateCourseQuestionRequest $request, string $questionId): JsonResponse
    {
        $data = $request->validated();

        $this->courseManagementService->updateCourseQuestion($questionId, $data);

        return response()->json(status: 204);
    }

    public function syncQuestions(SyncCourseQuestionsRequest $request, string $courseId): JsonResponse
    {
        $data = $request->validated();

        $this->courseManagementService->syncCourseQuestions(
            $courseId,
            $data['assessmentType'],
            $data['questions'],
            $data['deletedQuestionIds'] ?? [],
            $data['courseUpdates'] ?? [],
        );

        return response()->json(status: 204);
    }

    public function destroyQuestion(string $questionId): JsonResponse
    {
        $this->courseManagementService->deleteCourseQuestion($questionId);

        return response()->json(status: 204);
    }
}
