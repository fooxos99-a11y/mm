<?php

namespace App\Http\Middleware;

use App\Support\Security\RichTextPayloadSanitizer;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class SanitizeRichTextInput
{
    public function __construct(private readonly RichTextPayloadSanitizer $sanitizer)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        if (! in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            $request->merge($this->sanitizer->sanitize($request->all()));
        }

        return $next($request);
    }
}
