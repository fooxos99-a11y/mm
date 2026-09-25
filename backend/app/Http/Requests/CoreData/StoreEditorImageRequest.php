<?php

namespace App\Http\Requests\CoreData;

use App\Http\Requests\DashboardFormRequest;

class StoreEditorImageRequest extends DashboardFormRequest
{
    public function rules(): array
    {
        return [
            'image' => ['required', 'file', 'mimetypes:image/jpeg,image/png,image/gif,image/webp', 'max:5120'],
        ];
    }
}
