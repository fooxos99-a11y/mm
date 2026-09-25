<?php

namespace App\Http\Requests\Course;

use App\Http\Requests\Course\Concerns\HasCourseQuestionRules;
use App\Http\Requests\DashboardFormRequest;
use Illuminate\Validation\Rule;

class StoreCourseQuestionRequest extends DashboardFormRequest
{
    use HasCourseQuestionRules;

    public function rules(): array
    {
        return ['assessmentType' => ['required', Rule::in(['pre', 'post', 'tasks'])], ...$this->questionRules()];
    }
}
