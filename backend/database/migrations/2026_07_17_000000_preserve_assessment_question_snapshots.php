<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const SNAPSHOT_COLUMNS = [
        'question_prompt_snapshot',
        'question_type_snapshot',
        'question_options_snapshot',
        'correct_answer_snapshot',
        'question_points_snapshot',
        'allow_file_snapshot',
    ];

    private const COURSE_ANSWER_UNIQUE = 'course_answers_submission_question_unique';

    private const FINAL_ANSWER_UNIQUE = 'final_answers_submission_question_unique';

    public function up(): void
    {
        $this->addSnapshotColumns('course_submission_answers');
        $this->addSnapshotColumns('final_exam_submission_answers');

        $this->backfillSnapshots('course_submission_answers', 'course_questions');
        $this->backfillSnapshots('final_exam_submission_answers', 'final_exam_questions');

        $this->assertNoDuplicateAnswers('course_submission_answers');
        $this->assertNoDuplicateAnswers('final_exam_submission_answers');

        $this->restrictQuestionDeletion('course_submission_answers', 'course_questions');
        $this->restrictQuestionDeletion('final_exam_submission_answers', 'final_exam_questions');

        $this->addAnswerUniqueIndex('course_submission_answers', self::COURSE_ANSWER_UNIQUE);
        $this->addAnswerUniqueIndex('final_exam_submission_answers', self::FINAL_ANSWER_UNIQUE);
    }

    public function down(): void
    {
        $this->dropAnswerUniqueIndex('course_submission_answers', self::COURSE_ANSWER_UNIQUE);
        $this->dropAnswerUniqueIndex('final_exam_submission_answers', self::FINAL_ANSWER_UNIQUE);

        $this->cascadeQuestionDeletion('course_submission_answers', 'course_questions');
        $this->cascadeQuestionDeletion('final_exam_submission_answers', 'final_exam_questions');

        $this->dropSnapshotColumns('course_submission_answers');
        $this->dropSnapshotColumns('final_exam_submission_answers');
    }

    private function addSnapshotColumns(string $tableName): void
    {
        if (! Schema::hasTable($tableName)) {
            return;
        }

        $missingColumns = array_values(array_filter(
            self::SNAPSHOT_COLUMNS,
            fn (string $column): bool => ! Schema::hasColumn($tableName, $column),
        ));

        if ($missingColumns === []) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($missingColumns): void {
            if (in_array('question_prompt_snapshot', $missingColumns, true)) {
                $table->text('question_prompt_snapshot')->nullable();
            }

            if (in_array('question_type_snapshot', $missingColumns, true)) {
                $table->string('question_type_snapshot')->nullable();
            }

            if (in_array('question_options_snapshot', $missingColumns, true)) {
                $table->json('question_options_snapshot')->nullable();
            }

            if (in_array('correct_answer_snapshot', $missingColumns, true)) {
                $table->text('correct_answer_snapshot')->nullable();
            }

            if (in_array('question_points_snapshot', $missingColumns, true)) {
                $table->integer('question_points_snapshot')->nullable();
            }

            if (in_array('allow_file_snapshot', $missingColumns, true)) {
                $table->boolean('allow_file_snapshot')->nullable();
            }
        });
    }

    private function backfillSnapshots(string $answerTable, string $questionTable): void
    {
        if (! Schema::hasTable($answerTable) || ! Schema::hasTable($questionTable)) {
            return;
        }

        DB::table($answerTable)
            ->whereNull('question_prompt_snapshot')
            ->chunkById(500, function ($answers) use ($answerTable, $questionTable): void {
                $questions = DB::table($questionTable)
                    ->whereIn('id', $answers->pluck('question_id')->filter()->unique()->all())
                    ->get([
                        'id',
                        'prompt',
                        'question_type',
                        'options',
                        'correct_answer',
                        'points',
                        'allow_file',
                    ])
                    ->keyBy('id');

                foreach ($answers as $answer) {
                    $question = $questions->get($answer->question_id);

                    if (! $question) {
                        continue;
                    }

                    DB::table($answerTable)->where('id', $answer->id)->update([
                        'question_prompt_snapshot' => $question->prompt,
                        'question_type_snapshot' => $question->question_type,
                        'question_options_snapshot' => $question->options,
                        'correct_answer_snapshot' => $question->correct_answer,
                        'question_points_snapshot' => $question->points,
                        'allow_file_snapshot' => $question->allow_file,
                    ]);
                }
            }, 'id');
    }

    private function assertNoDuplicateAnswers(string $tableName): void
    {
        if (! Schema::hasTable($tableName)) {
            return;
        }

        $hasDuplicates = DB::table($tableName)
            ->select(['submission_id', 'question_id'])
            ->whereNotNull('question_id')
            ->groupBy('submission_id', 'question_id')
            ->havingRaw('COUNT(*) > 1')
            ->limit(1)
            ->get()
            ->isNotEmpty();

        if ($hasDuplicates) {
            throw new RuntimeException(
                "Cannot add the assessment answer uniqueness constraint to {$tableName}: "
                .'duplicate submission/question rows must be reviewed without discarding historical answers.'
            );
        }
    }

    private function addAnswerUniqueIndex(string $tableName, string $indexName): void
    {
        if (! Schema::hasTable($tableName) || $this->indexExists($tableName, $indexName)) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($indexName): void {
            $table->unique(['submission_id', 'question_id'], $indexName);
        });
    }

    private function restrictQuestionDeletion(string $answerTable, string $questionTable): void
    {
        $this->replaceQuestionForeignKey($answerTable, $questionTable, false);
    }

    private function cascadeQuestionDeletion(string $answerTable, string $questionTable): void
    {
        $this->replaceQuestionForeignKey($answerTable, $questionTable, true);
    }

    private function replaceQuestionForeignKey(string $answerTable, string $questionTable, bool $cascade): void
    {
        if (! Schema::hasTable($answerTable) || ! Schema::hasTable($questionTable)) {
            return;
        }

        Schema::table($answerTable, function (Blueprint $table): void {
            $table->dropForeign(['question_id']);
        });

        Schema::table($answerTable, function (Blueprint $table) use ($questionTable, $cascade): void {
            $foreign = $table->foreign('question_id')->references('id')->on($questionTable);

            if ($cascade) {
                $foreign->cascadeOnDelete();

                return;
            }

            $foreign->restrictOnDelete();
        });
    }

    private function dropAnswerUniqueIndex(string $tableName, string $indexName): void
    {
        if (! Schema::hasTable($tableName) || ! $this->indexExists($tableName, $indexName)) {
            return;
        }

        // Keep the submission foreign key indexed when MySQL removes the composite index.
        if (! Schema::hasIndex($tableName, ['submission_id'])) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName): void {
                $table->index('submission_id', $tableName.'_submission_id_index');
            });
        }

        Schema::table($tableName, function (Blueprint $table) use ($indexName): void {
            $table->dropUnique($indexName);
        });
    }

    private function dropSnapshotColumns(string $tableName): void
    {
        if (! Schema::hasTable($tableName)) {
            return;
        }

        $existingColumns = array_values(array_filter(
            self::SNAPSHOT_COLUMNS,
            fn (string $column): bool => Schema::hasColumn($tableName, $column),
        ));

        if ($existingColumns === []) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($existingColumns): void {
            $table->dropColumn($existingColumns);
        });
    }

    private function indexExists(string $tableName, string $indexName): bool
    {
        return collect(Schema::getIndexes($tableName))
            ->contains(fn (array $index): bool => ($index['name'] ?? null) === $indexName);
    }
};
