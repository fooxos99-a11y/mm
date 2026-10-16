<?php

namespace App\Models\Concerns;

use App\Support\DepartmentContext;
use App\Support\DepartmentData;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

trait BelongsToDepartment
{
    protected static function bootBelongsToDepartment(): void
    {
        static::saving(function (Model $model): void {
            if (! $model->getConnection()->getSchemaBuilder()->hasColumn($model->getTable(), 'department_id')) {
                return;
            }

            if (! array_key_exists('department_id', $model->getAttributes())) {
                $model->setAttribute('department_id', DepartmentContext::id());
            }

            if (! DepartmentContext::isUnscoped() && ($model->department_id === null
                || $model->department_id !== DepartmentContext::id())) {
                throw ValidationException::withMessages(['department_id' => 'لا يمكنك استخدام بيانات إدارة أخرى.']);
            }
        });
    }

    protected function newBaseQueryBuilder()
    {
        return DepartmentData::query($this->getConnection());
    }
}
