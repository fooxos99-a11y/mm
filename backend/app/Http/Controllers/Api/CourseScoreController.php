<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Assessment\SaveCourseScoresRequest;
use App\Services\CourseScoreService;
use Illuminate\Http\JsonResponse;

class CourseScoreController extends Controller
{
    public function update(SaveCourseScoresRequest $request, CourseScoreService $service): JsonResponse
    {
        return response()->json($service->save($request->user(), $request->validated()));
    }
}
