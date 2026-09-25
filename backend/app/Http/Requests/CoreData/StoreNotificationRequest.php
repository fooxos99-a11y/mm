<?php

namespace App\Http\Requests\CoreData;

use App\Http\Requests\DashboardFormRequest;

class StoreNotificationRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string'],
            'message' => ['required', 'string'],
            'targetBranchId' => ['nullable', 'string'],
            'targetLoginIds' => ['sometimes', 'array'],
            'targetLoginIds.*' => ['string'],
            'createdByName' => ['nullable', 'string'],
            'createdByRole' => ['nullable', 'string'],
        ];
    }
}
