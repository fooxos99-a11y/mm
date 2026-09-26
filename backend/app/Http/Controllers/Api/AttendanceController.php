<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Assessment\SetManualAttendanceRequest;
use App\Services\ManualAttendanceService;
use Illuminate\Http\JsonResponse;

class AttendanceController extends Controller
{
    public function __construct(
        private readonly ManualAttendanceService $attendanceService,
    ) {}

    public function store(SetManualAttendanceRequest $request): JsonResponse
    {
        $data = $request->validated();
        $this->attendanceService->save(
            $request->user(),
            $data['courseId'],
            $data['presentStudents'],
            $data['branchCode'] ?? null
        );

        return response()->json(status: 204);
    }
}
