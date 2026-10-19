<?php

namespace App\Http\Controllers;

use App\Http\Requests\Archive\ArchiveAllRequest;
use App\Http\Requests\Archive\AssignArchivedStudentRequest;
use App\Http\Requests\Archive\SearchArchivedStudentsRequest;
use App\Http\Requests\Archive\StoreArchiveRequest;
use App\Services\ArchiveLifecycleService;
use App\Services\DepartmentDirectoryService;
use Illuminate\Http\JsonResponse;

class ArchiveController extends Controller
{
    public function __construct(
        private readonly DepartmentDirectoryService $directory,
        private readonly ArchiveLifecycleService $lifecycle,
    ) {
    }

    public function index(): JsonResponse
    {
        return response()->json($this->directory->archives()['archives']);
    }

    public function searchStudents(SearchArchivedStudentsRequest $request): JsonResponse
    {
        return response()->json(
            $this->directory->searchStudents($request->validated('name')),
        );
    }

    public function store(StoreArchiveRequest $request): JsonResponse
    {
        return response()->json($this->directory->archiveForResponse($this->lifecycle->create($request->validated())), 201);
    }

    public function show(string $archiveId): JsonResponse
    {
        return response()->json($this->directory->archive($archiveId));
    }

    public function destroy(string $archiveId): JsonResponse
    {
        $this->directory->inArchiveDepartment($archiveId, fn () => $this->lifecycle->delete($archiveId), manage: true);

        return response()->json(['message' => 'Archive deleted successfully']);
    }

    public function studentDetail(string $archiveId, string $studentId): JsonResponse
    {
        return response()->json($this->directory->student($archiveId, $studentId));
    }

    public function assignStudent(AssignArchivedStudentRequest $request, string $archiveId): JsonResponse
    {
        return response()->json([
            'message' => 'Student archived successfully',
            'student' => $this->directory->inArchiveDepartment(
                $archiveId, fn () => $this->lifecycle->assignStudent($archiveId, $request->validated()), manage: true,
            ),
        ]);
    }

    public function archiveAll(ArchiveAllRequest $request): JsonResponse
    {
        return response()->json([
            'message' => 'All content archived successfully',
            'archive' => $this->directory->archiveForResponse($this->lifecycle->archiveAll($request->validated())),
        ]);
    }
}
