<?php

namespace App\Http\Requests\CoreData;

use App\Http\Requests\CoreData\Concerns\HasTrainingMaterialRules;
use App\Http\Requests\DashboardFormRequest;

class UpdateTrainingMaterialRequest extends DashboardFormRequest
{
    use HasTrainingMaterialRules;

    public function rules(): array
    {
        return $this->trainingMaterialRules(true);
    }
}
