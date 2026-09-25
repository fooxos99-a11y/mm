<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

abstract class DashboardFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('access-dashboard') === true;
    }
}
