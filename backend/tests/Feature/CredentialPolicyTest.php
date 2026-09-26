<?php

namespace Tests\Feature;

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
            [StoreStudentRequest::class],
            [UpdateStudentRequest::class],
            [StoreReciterRequest::class],
            [AcceptRegistrationRequest::class],
        ];
    }

    #[DataProvider('requests')]
    public function test_new_credentials_require_letters_numbers_and_ten_characters(string $request): void
    {
        $rules = ['password' => (new $request)->rules()['password']];
        foreach (['1', 'abcdefghijk', '12345678901'] as $password) {
            $this->assertTrue(
                Validator::make(['password' => $password, 'passwordConfirmation' => $password], $rules)->fails()
            );
        }
        $this->assertTrue(Validator::make([
            'password' => 'Secure-pass-123', 'passwordConfirmation' => 'Secure-pass-123',
        ], $rules)->passes());
    }
}
