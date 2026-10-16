<?php

namespace Tests\Feature;

use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Http\Requests\CoreData\StoreDashboardAccountRequest;
use App\Http\Requests\CoreData\StoreReciterRequest;
use App\Http\Requests\CoreData\StoreStudentRequest;
use App\Http\Requests\CoreData\UpdateStudentRequest;
use App\Http\Requests\Registration\AcceptRegistrationRequest;
use Illuminate\Support\Facades\Validator;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CredentialPolicyTest extends TestCase
{
    public static function requests(): array
    {
        return [
            [UpdatePasswordRequest::class],
            [StoreDashboardAccountRequest::class],
            [StoreStudentRequest::class],
            [UpdateStudentRequest::class],
            [StoreReciterRequest::class],
            [AcceptRegistrationRequest::class],
        ];
    }

    #[DataProvider('requests')]
    public function test_new_credentials_require_exactly_eight_digits(string $request): void
    {
        $rules = ['password' => (new $request)->rules()['password']];
        foreach (['1234567', '123456789', 'abcd1234', 'abcdefgh', '1234 678', "1234567\n", "12345678\n"] as $password) {
            $this->assertTrue(
                Validator::make(['password' => $password, 'passwordConfirmation' => $password], $rules)->fails()
            );
        }
        foreach (['01234567', '87654321', '٠١٢٣٤٥٦٧'] as $password) {
            $this->assertTrue(Validator::make([
                'password' => $password, 'passwordConfirmation' => $password,
            ], $rules)->passes());
        }
    }
}
