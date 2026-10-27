<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AttendanceSessionService;
use App\Services\CourseEnrollmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceSessionController extends Controller
{
    public function __construct(private readonly AttendanceSessionService $attendance)
    {
    }

    public function settings(): JsonResponse
    {
        return response()->json($this->attendance->settings());
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate(['enabled' => ['required', 'boolean'], 'mapsUrl' => ['present', 'nullable', 'string', 'max:4096'],
            'radius' => ['required', 'integer', 'min:1', 'max:100000']]);
        $data['mapsUrl'] = trim($data['mapsUrl'] ?? '');

        return response()->json($this->attendance->saveSettings($data));
    }

    public function index(string $courseId): JsonResponse
    {
        return response()->json($this->attendance->sessions($courseId));
    }

    public function enrollments(Request $request, string $courseId, CourseEnrollmentService $enrollments): JsonResponse
    {
        $data = $request->validate(['branchCode' => ['required', 'in:male,female']]);

        return response()->json(['studentIds' => $enrollments->studentIds($request->user(), $courseId, $data['branchCode'])]);
    }

    public function saveEnrollments(Request $request, string $courseId, CourseEnrollmentService $enrollments): JsonResponse
    {
        $data = $request->validate(['branchCode' => ['required', 'in:male,female'],
            'studentIds' => ['present', 'array', 'max:10000'], 'studentIds.*' => ['required', 'uuid', 'distinct']]);

        return response()->json(['studentIds' => $enrollments->save($request->user(), $courseId, $data['branchCode'], $data['studentIds'])]);
    }

    public function open(Request $request, string $courseId): JsonResponse
    {
        $data = $request->validate(['hours' => ['required', 'numeric', 'min:0.01', 'max:9999', 'decimal:0,2']]);

        return response()->json($this->attendance->open($request->user(), $courseId, (float) $data['hours']), 201);
    }

    public function close(string $courseId, string $sessionId): JsonResponse
    {
        $this->attendance->close($courseId, $sessionId);

        return response()->json(status: 204);
    }

    public function available(Request $request): JsonResponse
    {
        return response()->json($this->attendance->available($request->user()));
    }

    public function challenge(Request $request, string $courseId, string $sessionId): JsonResponse
    {
        return response()->json(['challenge' => $this->attendance->challenge($request->user(), $courseId, $sessionId)]);
    }

    public function attend(Request $request, string $courseId, string $sessionId): JsonResponse
    {
        $data = $request->validate(['latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'], 'accuracy' => ['required', 'numeric', 'gt:0'],
            'timestamp' => ['required', 'numeric'], 'challenge' => ['required', 'string', 'max:4096']]);
        $this->attendance->attend($request->user(), $courseId, $sessionId, $data);

        return response()->json(status: 204);
    }
}
