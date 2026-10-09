<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\CourseManagementService;
use Laravel\Sanctum\Sanctum;

class QuestionSaveTest extends CoreDataApiTestCase
{
    public function test_saved_questions_return_persisted_ids_options_and_answer_keys_and_can_be_edited(): void
    {
        foreach (['pre', 'post', 'tasks'] as $assessmentType) {
            $course = app(CourseManagementService::class)->createCourse('Save questions', false, [
                'entityType' => $assessmentType === 'tasks' ? 'task' : 'course',
            ]);
            $route = '/api/dashboard/courses/'.$course['id'].'/questions/sync';
            $payload = ['assessmentType' => $assessmentType, 'questions' => [
                ['prompt' => 'Choose', 'type' => 'multiple', 'options' => ['First', 'Second'], 'points' => 2, 'correctAnswer' => 'First'],
                ['prompt' => 'True or false', 'type' => 'truefalse', 'options' => [], 'points' => 1, 'correctAnswer' => 'صح'],
                ['prompt' => 'Explain', 'type' => 'text', 'options' => [], 'points' => 3, 'correctAnswer' => ''],
            ]];
            $payload['questions'] = array_map(fn ($question) => [...$question, 'allowFile' => false], $payload['questions']);
            $saved = $this->putJson($route, $payload)->assertOk()->assertJsonCount(3, 'questions')
                ->assertJsonPath('questions.0.correctAnswer', 'First')
                ->assertJsonPath('questions.1.type', 'truefalse')
                ->assertJsonPath('questions.1.options', ['صح', 'خطأ'])
                ->assertJsonPath('questions.1.correctAnswer', 'صح')->json('questions');
            foreach ($saved as $question) {
                $this->assertDatabaseHas('course_questions', ['id' => $question['id'], 'course_id' => $course['id']]);
            }
            $saved[1]['prompt'] = 'Edited true or false';
            $this->putJson($route, ['assessmentType' => $assessmentType, 'questions' => [$saved[1]]])
                ->assertOk()->assertJsonCount(3, 'questions')
                ->assertJsonPath('questions.1.id', $saved[1]['id'])
                ->assertJsonPath('questions.1.prompt', 'Edited true or false')
                ->assertJsonPath('questions.1.options', ['صح', 'خطأ']);
            Sanctum::actingAs(User::factory()->create(['role' => 'student']));
            $this->putJson($route, $payload)->assertForbidden();
            $this->assertDatabaseCount('course_questions', 3 * (array_search($assessmentType, ['pre', 'post', 'tasks']) + 1));
            Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        }
    }
}
