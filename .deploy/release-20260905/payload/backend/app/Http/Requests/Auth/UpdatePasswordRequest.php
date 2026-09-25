<?php

namespace App\Http\Requests\Auth;

use App\Support\Security\PasswordPolicy;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'currentPassword' => ['required', 'string'],
            'password' => ['required', 'string', PasswordPolicy::rule(), 'max:255', 'same:passwordConfirmation'],
            'passwordConfirmation' => ['required', 'string', 'max:255'],
        ];
    }
}
