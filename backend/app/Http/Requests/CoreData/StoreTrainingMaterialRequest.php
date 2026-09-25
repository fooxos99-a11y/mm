<?php

namespace App\Http\Requests\CoreData;

use App\Http\Requests\CoreData\Concerns\HasTrainingMaterialRules;
use App\Http\Requests\DashboardFormRequest;

class StoreTrainingMaterialRequest extends DashboardFormRequest
{
    use HasTrainingMaterialRules;

    public function rules(): array
    {
        return $this->trainingMaterialRules(false);
    }
}
