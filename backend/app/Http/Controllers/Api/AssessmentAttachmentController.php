<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AssessmentAttachmentAccessService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

final class AssessmentAttachmentController extends Controller
{
    public function __invoke(Request $request, string $reference, AssessmentAttachmentAccessService $access): BinaryFileResponse
    {
        return response()->file($access->authorizedPath($request->user(), $reference), [
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
