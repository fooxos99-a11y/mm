<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

abstract class AuthenticatedFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }
}
