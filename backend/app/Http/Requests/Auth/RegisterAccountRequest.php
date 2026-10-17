<?php

namespace App\Http\Requests\Auth;

use App\Support\Security\PasswordPolicy;
use Illuminate\Foundation\Http\FormRequest;

final class RegisterAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user('sanctum')?->role === 'super_admin';
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:6', 'max:255'],
            'loginCode' => ['required', 'string', 'max:100'],
            'password' => ['required', 'string', PasswordPolicy::rule(), 'same:passwordConfirmation'],
            'passwordConfirmation' => ['required', 'string'],
        ];
    }
}
