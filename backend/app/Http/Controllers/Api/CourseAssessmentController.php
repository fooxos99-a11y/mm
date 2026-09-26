<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Assessment\BulkImportAssessmentsRequest;
use App\Http\Requests\Assessment\SetAnswerManualScoreRequest;
use App\Http\Requests\Assessment\SetAssessmentManualScoreRequest;
use App\Http\Requests\Assessment\SetTaskReviewStatusRequest;
use App\Http\Requests\Assessment\SubmitAssessmentRequest;
use App\Services\AssessmentAccessService;
use App\Services\AssessmentAnswerReviewService;
use App\Services\CourseAssessmentService;
use Illuminate\Http\JsonResponse;

class CourseAssessmentController extends Controller
{
    public function __construct(
        private readonly AssessmentAccessService $accessService,
        private readonly CourseAssessmentService $courseAssessmentService,
        private readonly AssessmentAnswerReviewService $answerReviews,
    ) {}

    public function store(SubmitAssessmentRequest $request): JsonResponse
    {
        $data = $this->accessService->prepareCourseSubmission(
            $request->user(),
            $request->is('api/public/*'),
            $request->validated(),
        );

        return response()->json(
            $this->courseAssessmentService->submitAssessment($data['courseId'], $data['assessmentType'], $data),
            201,
        );
    }

    public function import(BulkImportAssessmentsRequest $request): JsonResponse
    {
        $data = $request->validated();

        return response()->json(
            $this->courseAssessmentService->bulkImportAssessments(
                $data['courseId'],
                $data['assessmentType'],
                $data['submissions']
            ),
        );
    }

    public function updateScore(SetAssessmentManualScoreRequest $request, string $submissionId): JsonResponse
    {
        $this->accessService->assertCanManageSubmissionBranch($request->user(), $submissionId);
        $data = $request->validated();
        $this->courseAssessmentService->setAssessmentManualScore(
            $submissionId,
            isset($data['score']) ? (float) $data['score'] : null,
        );

        return response()->json(status: 204);
    }

    public function updateAnswerScore(
        SetAnswerManualScoreRequest $request,
        string $submissionId,
        string $answerId
    ): JsonResponse {
        $this->accessService->assertCanManageSubmissionBranch($request->user(), $submissionId);
        $score = $request->validated('score');
        $this->answerReviews->reviewCourseAnswer(
            $submissionId,
            $answerId,
            $score === null ? null : (float) $score,
            (string) $request->user()->id,
        );

        return response()->json(status: 204);
    }

    public function reviewTask(SetTaskReviewStatusRequest $request, string $submissionId): JsonResponse
    {
        $this->accessService->assertCanManageSubmissionBranch($request->user(), $submissionId);
        $this->courseAssessmentService->setTaskReviewStatus(
            $submissionId,
            $request->validated('status'),
            (string) $request->user()->id,
        );

        return response()->json(status: 204);
    }
}
