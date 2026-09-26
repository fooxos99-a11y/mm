<?php

namespace App\Http\Controllers;

use App\Http\Requests\Archive\ArchiveAllRequest;
use App\Http\Requests\Archive\AssignArchivedStudentRequest;
use App\Http\Requests\Archive\SearchArchivedStudentsRequest;
use App\Http\Requests\Archive\StoreArchiveRequest;
use App\Services\ArchivedStudentDetailService;
use App\Services\ArchiveLifecycleService;
use App\Services\ArchiveQueryService;
use Illuminate\Http\JsonResponse;

class ArchiveController extends Controller
{
    public function __construct(
        private readonly ArchiveQueryService $queries,
        private readonly ArchiveLifecycleService $lifecycle,
        private readonly ArchivedStudentDetailService $studentDetails,
    ) {
    }

    public function index(): JsonResponse
    {
        return response()->json($this->queries->list());
    }

    public function searchStudents(SearchArchivedStudentsRequest $request): JsonResponse
    {
        return response()->json(
            $this->queries->searchStudents($request->validated('name')),
        );
    }

    public function store(StoreArchiveRequest $request): JsonResponse
    {
        return response()->json($this->lifecycle->create($request->validated()), 201);
    }

    public function show(string $archiveId): JsonResponse
    {
        return response()->json($this->queries->show($archiveId));
    }

    public function destroy(string $archiveId): JsonResponse
    {
        $this->lifecycle->delete($archiveId);

        return response()->json(['message' => 'Archive deleted successfully']);
    }

    public function studentDetail(string $archiveId, string $studentId): JsonResponse
    {
        return response()->json($this->studentDetails->get($archiveId, $studentId));
    }

    public function assignStudent(AssignArchivedStudentRequest $request, string $archiveId): JsonResponse
    {
        return response()->json([
            'message' => 'Student archived successfully',
            'student' => $this->lifecycle->assignStudent($archiveId, $request->validated()),
        ]);
    }

    public function archiveAll(ArchiveAllRequest $request): JsonResponse
    {
        return response()->json([
            'message' => 'All content archived successfully',
            'archive' => $this->lifecycle->archiveAll($request->validated()),
        ]);
    }
}
