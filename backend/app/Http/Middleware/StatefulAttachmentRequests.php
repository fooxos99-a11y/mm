<?php

namespace App\Http\Middleware;

use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

final class StatefulAttachmentRequests extends EnsureFrontendRequestsAreStateful
{
    public static function fromFrontend($request)
    {
        // Opening a private file with rel=noreferrer omits the usual SPA headers.
        // Only read-only file routes may recover their authenticated cookie session.
        if (in_array($request->method(), ['GET', 'HEAD'], true)
            && ! $request->headers->has('origin') && ! $request->headers->has('referer')
            && $request->is('api/assessment-attachments/*', '*/api/assessment-attachments/*',
                'api/training-material-attachments/*', '*/api/training-material-attachments/*')) {
            return true;
        }

        return parent::fromFrontend($request);
    }
}
