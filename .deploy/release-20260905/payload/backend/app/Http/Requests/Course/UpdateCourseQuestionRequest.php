<?php

namespace App\Http\Requests\Course;

use App\Http\Requests\Course\Concerns\HasCourseQuestionRules;
use App\Http\Requests\DashboardFormRequest;

class UpdateCourseQuestionRequest extends DashboardFormRequest
{
    use HasCourseQuestionRules;

    public function rules(): array
    {
        return $this->questionRules();
    }
}
