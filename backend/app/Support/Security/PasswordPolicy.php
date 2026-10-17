<?php

namespace App\Support\Security;

use Illuminate\Validation\Rules\Password;

final class PasswordPolicy
{
    private function __construct() {}

    public static function rule(): Password
    {
        return Password::min(1)->max(255);
    }
}
