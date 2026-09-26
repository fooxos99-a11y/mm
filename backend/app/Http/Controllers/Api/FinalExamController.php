<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Assessment\CopyFinalExamQuestionsRequest;
use App\Http\Requests\Assessment\SetAnswerManualScoreRequest;
use App\Http\Requests\Assessment\SetFinalExamManualScoreRequest;
use App\Http\Requests\Assessment\StoreFinalExamQuestionRequest;
use App\Http\Requests\Assessment\SubmitFinalExamRequest;
use App\Http\Requests\Assessment\UpdateFinalExamNotificationTemplateRequest;
use App\Http\Requests\Assessment\UpdateFinalExamQuestionRequest;
use App\Http\Requests\Assessment\UpdateFinalExamSettingRequest;
use App\Services\AssessmentAccessService;
use App\Services\AssessmentAnswerReviewService;
use App\Services\FinalExamService;
use Illuminate\Http\JsonResponse;

class FinalExamController extends Controller
{
    public function __construct(
        private readonly AssessmentAccessService $accessService,
        private readonly FinalExamService $finalExamService,
        private readonly AssessmentAnswerReviewService $answerReviews,
    ) {}

    public function storeQuestion(StoreFinalExamQuestionRequest $request): JsonResponse
    {
        $data = $request->validated();

        return response()->json(
            $this->finalExamService->addFinalExamQuestion($data['branchCode'], $data),
            201,
        );
    }

    public function updateQuestion(UpdateFinalExamQuestionRequest $request, string $questionId): JsonResponse
    {
        $this->finalExamService->updateFinalExamQuestion($questionId, $request->validated());

        return response()->json(status: 204);
    }

    public function destroyQuestion(string $questionId): JsonResponse
    {
        $this->finalExamService->deleteFinalExamQuestion($questionId);

        return response()->json(status: 204);
    }

    public function updateSetting(UpdateFinalExamSettingRequest $request, string $branchCode): JsonResponse
    {
        $data = $request->validated();
        $this->finalExamService->updateFinalExamSetting(
            $branchCode,
            $data['isEnabled'],
            $data['closesAt'] ?? null,
            $data['notificationTemplate'] ?? null,
        );

        return response()->json(status: 204);
    }

    public function updateNotificationTemplate(
        UpdateFinalExamNotificationTemplateRequest $request,
        string $branchCode
    ): JsonResponse {
        $this->finalExamService->updateFinalExamNotificationTemplate(
            $branchCode,
            $request->validated('notificationTemplate'),
        );

        return response()->json(status: 204);
    }

    public function storeSubmission(SubmitFinalExamRequest $request): JsonResponse
    {
        $data = $this->accessService->prepareFinalExamSubmission(
            $request->user(),
            $request->is('api/public/*'),
            $request->validated(),
        );

        return response()->json($this->finalExamService->submitFinalExam($data), 201);
    }

    public function copyQuestions(CopyFinalExamQuestionsRequest $request): JsonResponse
    {
        $data = $request->validated();
        $this->finalExamService->copyFinalExamQuestions($data['from'], $data['to'], $data['move']);

        return response()->json(status: 204);
    }

    public function updateScore(SetFinalExamManualScoreRequest $request, string $submissionId): JsonResponse
    {
        $this->accessService->assertCanManageSubmissionBranch($request->user(), $submissionId, true);
        $this->finalExamService->setFinalExamManualScore($submissionId, $request->validated('score'));

        return response()->json(status: 204);
    }

    public function updateAnswerScore(
        SetAnswerManualScoreRequest $request,
        string $submissionId,
        string $answerId
    ): JsonResponse {
        $this->accessService->assertCanManageSubmissionBranch($request->user(), $submissionId, true);
        $score = $request->validated('score');
        $this->answerReviews->reviewFinalAnswer(
            $submissionId,
            $answerId,
            $score === null ? null : (float) $score,
            (string) $request->user()->id,
        );

        return response()->json(status: 204);
    }
}
