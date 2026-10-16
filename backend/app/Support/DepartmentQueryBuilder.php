<?php

namespace App\Support;

use Closure;
use Illuminate\Database\Query\Builder;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Validation\ValidationException;
use LogicException;

/**
 * Scope at execution, after callers finish their OR conditions. Joining a department
 * table is scoped in ON, so a left join keeps its normal optional-row semantics.
 */
class DepartmentQueryBuilder extends Builder
{
    private ?string $departmentId;

    private bool $unscoped;

    private ?array $scopedWheres = null;

    public function __construct($connection, $grammar = null, $processor = null)
    {
        parent::__construct($connection, $grammar, $processor);
        $this->departmentId = DepartmentContext::id();
        $this->unscoped = DepartmentContext::isUnscoped();
    }

    public function newQuery()
    {
        $query = new static($this->connection, $this->grammar, $this->processor);
        $query->departmentId = $this->departmentId;
        $query->unscoped = $this->unscoped;

        return $query;
    }

    public function applyBeforeQueryCallbacks()
    {
        parent::applyBeforeQueryCallbacks();

        if (! $this->scopesTable($this->from)) {
            return;
        }

        if ($this->scopedWheres !== null && $this->scopedWheres === $this->wheres) {
            return;
        }

        // A reused builder may have acquired another OR since its last execution.
        // Regroup the complete expression each time rather than relying on ordering.
        if ($this->wheres) {
            $nested = $this->forNestedWhere();
            $nested->wheres = $this->wheres;
            $nested->setBindings($this->bindings['where'], 'where');
            $this->wheres = [];
            $this->setBindings([], 'where');
            $this->addNestedWhereQuery($nested);
        }

        if ($this->departmentId === null) {
            $this->whereRaw('1 = 0');
        } else {
            $this->where($this->tableAlias($this->from).'.department_id', $this->departmentId);
        }
        $this->scopedWheres = $this->wheres;
    }

    public function addWhereExistsQuery(Builder $query, $boolean = 'and', $not = false)
    {
        // Grammar compiles EXISTS directly, bypassing the nested builder's toSql().
        $query->applyBeforeQueryCallbacks();

        return parent::addWhereExistsQuery($query, $boolean, $not);
    }

    protected function whereSub($column, $operator, $callback, $boolean)
    {
        if ($callback instanceof Closure) {
            $callback($query = $this->newQuery());
        } else {
            $query = $callback instanceof EloquentBuilder ? $callback->toBase() : $callback;
        }
        $query->applyBeforeQueryCallbacks();

        return parent::whereSub($column, $operator, $query, $boolean);
    }

    public function union($query, $all = false)
    {
        if ($query instanceof Closure) {
            $query($query = $this->newQuery());
        }
        $query = $query instanceof EloquentBuilder ? $query->toBase() : $query;
        $query->applyBeforeQueryCallbacks();

        return parent::union($query, $all);
    }

    public function join($table, $first, $operator = null, $second = null, $type = 'inner', $where = false)
    {
        if (! $this->scopesTable($table)) {
            return parent::join($table, $first, $operator, $second, $type, $where);
        }

        return parent::join($table, function (JoinClause $join) use ($table, $first, $operator, $second, $where): void {
            if ($first instanceof Closure) {
                $first($join);
            } else {
                $join->{$where ? 'where' : 'on'}($first, $operator, $second);
            }

            if ($join->wheres) {
                $nested = $join->forNestedWhere();
                $nested->wheres = $join->wheres;
                $nested->setBindings($join->bindings['where'], 'where');
                $join->wheres = [];
                $join->setBindings([], 'where');
                $join->addNestedWhereQuery($nested);
            }

            if ($this->departmentId === null) {
                $join->whereRaw('1 = 0');
            } else {
                $join->where($this->tableAlias($table).'.department_id', $this->departmentId);
            }
        }, null, null, $type);
    }

    public function insert(array $values)
    {
        return parent::insert($this->stampRows($values));
    }

    public function insertOrIgnore(array $values)
    {
        return parent::insertOrIgnore($this->stampRows($values));
    }

    public function insertGetId(array $values, $sequence = null)
    {
        return parent::insertGetId($this->stampRow($values), $sequence);
    }

    public function update(array $values)
    {
        $this->assertWritable($values);

        return parent::update($values);
    }

    public function updateFrom(array $values)
    {
        $this->assertWritable($values);

        return parent::updateFrom($values);
    }

    public function upsert(array $values, array|string $uniqueBy, ?array $update = null)
    {
        $values = $this->stampRows($values);
        if ($values === [] || ! $this->scopesTable($this->from)) {
            return parent::upsert($values, $uniqueBy, $update);
        }

        $rows = is_array(reset($values)) ? $values : [$values];
        foreach ($rows as $row) {
            // MySQL ignores uniqueBy and uses any unique index, including global IDs.
            foreach ($this->globalUniqueColumns() as $column) {
                if (isset($row[$column]) && $this->connection->table($this->baseTable($this->from))
                    ->where($column, $row[$column])->where(fn (Builder $query) => $query
                        ->whereNull('department_id')->orWhere('department_id', '!=', $this->departmentId))->exists()) {
                    throw ValidationException::withMessages([$column => 'السجل تابع لإدارة أخرى.']);
                }
            }
        }

        $uniqueBy = (array) $uniqueBy;
        if (in_array($this->baseTable($this->from), [
            'final_exam_settings', 'role_permissions', 'registration_settings',
            'app_settings', 'completion_requirement_settings', 'archives', 'satisfaction_templates',
        ], true)) {
            $uniqueBy = array_values(array_unique(['department_id', ...$uniqueBy]));
        }
        foreach ($rows as $row) {
            $attributes = array_intersect_key($row, array_flip($uniqueBy));
            if (count($attributes) === count($uniqueBy) && $this->connection->table($this->baseTable($this->from))
                ->where($attributes)->where(fn (Builder $query) => $query
                    ->whereNull('department_id')->orWhere('department_id', '!=', $this->departmentId))->exists()) {
                throw ValidationException::withMessages(['department_id' => 'السجل تابع لإدارة أخرى.']);
            }
        }
        $update ??= array_keys($rows[0]);
        $this->assertWritable($update);
        $update = array_filter($update,
            fn ($value, $key) => (is_int($key) ? $value : $key) !== 'department_id', ARRAY_FILTER_USE_BOTH);

        return parent::upsert($values, $uniqueBy, $update);
    }

    public function truncate()
    {
        if ($this->scopesTable($this->from)) {
            $this->delete();

            return;
        }

        parent::truncate();
    }

    public function insertUsing(array $columns, $query)
    {
        $this->assertInsertUsingAllowed();

        return parent::insertUsing($columns, $query);
    }

    public function insertOrIgnoreUsing(array $columns, $query)
    {
        $this->assertInsertUsingAllowed();

        return parent::insertOrIgnoreUsing($columns, $query);
    }

    private function assertInsertUsingAllowed(): void
    {
        if ($this->scopesTable($this->from)) {
            throw new LogicException('Use stamped department inserts instead of insertUsing.');
        }
    }

    private function stampRows(array $values): array
    {
        if ($values === []) {
            return [];
        }

        return is_array(reset($values))
            ? array_map(fn (array $row) => $this->stampRow($row), $values)
            : $this->stampRow($values);
    }

    private function stampRow(array $values): array
    {
        if ($this->scopesTable($this->from)) {
            $this->assertWritable($values);
            $values['department_id'] = $this->departmentId;
        }

        return $values;
    }

    private function assertWritable(array $values): void
    {
        if (! $this->scopesTable($this->from)) {
            return;
        }

        if ($this->departmentId === null || (array_key_exists('department_id', $values)
            && $values['department_id'] !== $this->departmentId)) {
            throw ValidationException::withMessages(['department_id' => 'لا يمكنك استخدام بيانات إدارة أخرى.']);
        }

        foreach ($this->references() as $column => $table) {
            if (! isset($values[$column]) || ! is_string($values[$column]) || $values[$column] === '') {
                continue;
            }

            $reference = $this->connection->table($table)->where('id', $values[$column]);
            $reference->where(function (Builder $query) use ($table): void {
                $query->where('department_id', $this->departmentId);
                if ($table === 'users') {
                    $query->orWhere('role', 'super_admin');
                }
            });
            if (! $reference->exists()) {
                throw ValidationException::withMessages([$column => 'السجل غير متاح داخل هذه الإدارة.']);
            }
        }
    }

    private function scopesTable($table): bool
    {
        return ! $this->unscoped && is_string($table)
            && in_array($this->baseTable($table), DepartmentData::TABLES, true)
            // Earlier migrations invoke application services before this migration exists.
            && $this->connection->getSchemaBuilder()->hasColumn($this->baseTable($table), 'department_id');
    }

    private function baseTable(string $table): string
    {
        return preg_split('/\s+(?:as\s+)?/i', trim($table))[0];
    }

    private function tableAlias(string $table): string
    {
        $parts = preg_split('/\s+(?:as\s+)?/i', trim($table));

        return $parts[1] ?? $parts[0];
    }

    private function globalUniqueColumns(): array
    {
        return match ($this->baseTable($this->from)) {
            'users' => ['id', 'login_code', 'email'],
            'students', 'final_exam_submissions' => ['id', 'login_code'],
            default => ['id'],
        };
    }

    private function references(): array
    {
        $table = $this->baseTable($this->from);
        $common = [
            'archive_id' => 'archives', 'created_by' => 'users', 'reviewed_by' => 'users',
            'closed_by' => 'users', 'finalized_by' => 'users', 'marked_by_reciter_id' => 'reciters',
            'user_id' => 'users', 'student_id' => 'students', 'reciter_id' => 'reciters',
            'course_id' => 'courses', 'global_template_id' => 'satisfaction_templates',
            'task_template_id' => 'task_templates', 'setting_id' => 'course_score_settings',
            'score_id' => 'course_manual_scores',
        ];

        return match ($table) {
            'course_submission_answers' => $common + ['submission_id' => 'course_submissions', 'question_id' => 'course_questions'],
            'final_exam_submission_answers' => $common + ['submission_id' => 'final_exam_submissions', 'question_id' => 'final_exam_questions'],
            'satisfaction_responses' => $common + ['question_id' => 'satisfaction_questions'],
            default => $common,
        };
    }
}
