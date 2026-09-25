<?php

namespace App\Http\Requests;

class ClientErrorRequest extends AuthenticatedFormRequest
{
    public function rules(): array
    {
        return [
            'message' => ['required', 'string', 'max:500'],
            'context' => ['nullable', 'string', 'max:200'],
            'path' => ['nullable', 'string', 'max:500'],
        ];
    }
}
