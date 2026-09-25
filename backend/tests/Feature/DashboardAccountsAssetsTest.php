<?php

namespace Tests\Feature;

use App\Models\EditorAsset;
use App\Models\TrainingMaterial;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DashboardAccountsAssetsTest extends CoreDataApiTestCase
{
    public function test_dashboard_account_flow_works(): void
    {
        $this->postJson('/api/dashboard/accounts', [
            'name' => 'Unsafe Manager',
            'loginCode' => '5000',
            'role' => 'male_manager',
        ])->assertUnprocessable()->assertJsonValidationErrors(['password']);

        $createResponse = $this->postJson('/api/dashboard/accounts', [
            'name' => 'Manager User',
            'loginCode' => '5001',
            'role' => 'male_manager',
            'password' => 'Secure-password-5001',
        ]);

        $createResponse->assertCreated()->assertJsonPath('loginCode', '5001');

        $listResponse = $this->getJson('/api/dashboard/accounts');
        $createdAccount = collect($listResponse->json())->firstWhere('loginCode', '5001');
        $accountId = $createdAccount['id'] ?? null;

        $listResponse->assertOk()->assertJsonFragment([
            'name' => 'Manager User',
            'loginCode' => '5001',
            'role' => 'male_manager',
        ]);

        $this->assertNotNull($accountId);

        $this->deleteJson('/api/dashboard/accounts/'.$accountId)
            ->assertNoContent();

        $this->getJson('/api/dashboard/accounts')
            ->assertOk()
            ->assertJsonMissing(['loginCode' => '5001']);
    }

    public function test_dashboard_accounts_require_strong_temporary_passwords(): void
    {
        $this->postJson('/api/dashboard/accounts', [
            'name' => 'Admin1',
            'loginCode' => '5002',
            'role' => 'male_manager',
            'password' => 'secret',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);

        $this->postJson('/api/dashboard/accounts', [
            'name' => 'Admin1',
            'loginCode' => '5002',
            'role' => 'male_manager',
            'password' => 'Secure-password-5002',
        ])->assertCreated();

        $this->assertDatabaseHas('users', [
            'login_code' => '5002',
            'must_change_password' => true,
        ]);

        $this->postJson('/api/dashboard/accounts', [
            'name' => 'Admin',
            'loginCode' => '5003',
            'role' => 'male_manager',
            'password' => 'short',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'password']);
    }

    public function test_editor_image_upload_works(): void
    {
        Storage::fake('public');

        $response = $this->postJson('/api/dashboard/editor-images', [
            'image' => UploadedFile::fake()->image('task-image.png', 1200, 800),
        ]);

        $response
            ->assertCreated()
            ->assertJsonStructure(['id', 'name', 'url']);

        $this->assertDatabaseHas('editor_assets', [
            'created_by' => auth()->id(),
        ]);

        $this->assertDatabaseHas('media', [
            'model_type' => EditorAsset::class,
            'collection_name' => 'editor-images',
            'mime_type' => 'image/png',
            'disk' => 'public',
        ]);

        $mediaPath = DB::table('media')->where('model_type', EditorAsset::class)->value('id');

        $this->assertNotNull($mediaPath);
    }

    public function test_training_materials_flow_works(): void
    {
        Storage::fake('public');

        $createResponse = $this->post('/api/dashboard/training-materials', [
            'title' => 'حقيبة المدرب',
            'description' => 'ملفات التدريب الأساسية',
            'branchId' => 'female',
            'attachments' => [
                [
                    'label' => 'دليل التدريب',
                    'file' => UploadedFile::fake()->create('guide.pdf', 100, 'application/pdf'),
                ],
                [
                    'label' => 'غلاف الحقيبة',
                    'file' => UploadedFile::fake()->image('cover.png', 800, 600),
                ],
                [
                    'label' => 'ملف مضغوط',
                    'file' => UploadedFile::fake()->create('resources.zip', 120, 'application/zip'),
                ],
            ],
        ], [
            'Accept' => 'application/json',
        ]);

        $materialId = $createResponse->json('id');

        $createResponse
            ->assertCreated()
            ->assertJsonPath('title', 'حقيبة المدرب')
            ->assertJsonPath('targetBranchId', 'female')
            ->assertJsonPath('attachments.0.displayName', 'دليل التدريب')
            ->assertJsonPath('attachments.2.displayName', 'ملف مضغوط')
            ->assertJsonCount(3, 'attachments');

        $this->assertDatabaseHas('training_materials', [
            'title' => 'حقيبة المدرب',
            'target_branch_code' => 'female',
        ]);

        $this->assertDatabaseHas('media', [
            'model_type' => TrainingMaterial::class,
            'model_id' => $materialId,
            'collection_name' => 'attachments',
            'disk' => 'public',
        ]);

        $this->getJson('/api/dashboard/snapshot')
            ->assertOk()
            ->assertJsonPath('trainingMaterials.0.title', 'حقيبة المدرب')
            ->assertJsonPath('trainingMaterials.0.targetBranchId', 'female')
            ->assertJsonPath('trainingMaterials.0.attachments.1.displayName', 'غلاف الحقيبة')
            ->assertJsonPath('trainingMaterials.0.attachments.2.displayName', 'ملف مضغوط')
            ->assertJsonCount(3, 'trainingMaterials.0.attachments');

        $this->deleteJson('/api/dashboard/training-materials/'.$materialId)
            ->assertNoContent();

        $this->assertDatabaseMissing('training_materials', [
            'id' => $materialId,
        ]);
    }

    public function test_training_material_attachment_without_uuid_has_a_working_preview_url(): void
    {
        Storage::fake('public');

        $createResponse = $this->post('/api/dashboard/training-materials', [
            'title' => 'صورة للمعاينة',
            'branchId' => 'all',
            'attachments' => [[
                'label' => 'صورة المادة',
                'file' => UploadedFile::fake()->image('preview.png', 320, 240),
            ]],
        ], ['Accept' => 'application/json'])->assertCreated();

        $materialId = $createResponse->json('id');
        $mediaId = DB::table('media')->where('model_id', $materialId)->value('id');
        DB::table('media')->where('id', $mediaId)->update(['uuid' => null]);

        $attachment = $this->getJson('/api/dashboard/training-materials')
            ->assertOk()
            ->json('0.attachments.0');

        $this->assertSame((string) $mediaId, $attachment['id']);
        $this->assertStringEndsWith('/api/training-material-attachments/'.$mediaId, $attachment['url']);

        $this->get(parse_url($attachment['url'], PHP_URL_PATH))
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png');
    }

    public function test_editor_image_upload_rejects_svg(): void
    {
        Storage::fake('public');

        $this->postJson('/api/dashboard/editor-images', [
            'image' => UploadedFile::fake()->create('unsafe.svg', 4, 'image/svg+xml'),
        ])->assertUnprocessable();
    }

    public function test_training_material_rejects_scriptable_attachment_types(): void
    {
        Storage::fake('public');

        $this->post('/api/dashboard/training-materials', [
            'title' => 'مادة غير آمنة',
            'description' => '',
            'branchId' => 'all',
            'attachments' => [
                [
                    'label' => 'HTML',
                    'file' => UploadedFile::fake()->create('unsafe.html', 4, 'text/html'),
                ],
            ],
        ], [
            'Accept' => 'application/json',
        ])->assertUnprocessable();
    }

    public function test_training_material_can_be_updated_with_attachment_add_remove_and_rename(): void
    {
        Storage::fake('public');

        $createResponse = $this->post('/api/dashboard/training-materials', [
            'title' => 'حقيبة قابلة للتعديل',
            'description' => 'الوصف الأول',
            'branchId' => 'male',
            'attachments' => [
                [
                    'label' => 'ملف أول',
                    'file' => UploadedFile::fake()->create('first.pdf', 100, 'application/pdf'),
                ],
                [
                    'label' => 'ملف ثان',
                    'file' => UploadedFile::fake()->create('second.zip', 120, 'application/zip'),
                ],
            ],
        ], [
            'Accept' => 'application/json',
        ]);

        $materialId = $createResponse->json('id');
        $firstAttachmentId = $createResponse->json('attachments.0.id');

        $updateResponse = $this->post(
            '/api/dashboard/training-materials/'.$materialId,
            [
                '_method' => 'PUT',
                'title' => 'حقيبة بعد التعديل',
                'description' => 'الوصف بعد التعديل',
                'branchId' => 'female',
                'attachments' => [
                    [
                        'id' => $firstAttachmentId,
                        'label' => 'الملف الأول بعد التعديل',
                    ],
                    [
                        'label' => 'ملف جديد',
                        'file' => UploadedFile::fake()->image('new-cover.png', 800, 600),
                    ],
                ],
            ],
            [
                'Accept' => 'application/json',
            ],
        );

        $updateResponse
            ->assertOk()
            ->assertJsonPath('title', 'حقيبة بعد التعديل')
            ->assertJsonPath('description', 'الوصف بعد التعديل')
            ->assertJsonPath('targetBranchId', 'female')
            ->assertJsonPath('attachments.0.displayName', 'الملف الأول بعد التعديل')
            ->assertJsonPath('attachments.1.displayName', 'ملف جديد')
            ->assertJsonCount(2, 'attachments');

        $this->getJson('/api/dashboard/snapshot')
            ->assertOk()
            ->assertJsonPath('trainingMaterials.0.title', 'حقيبة بعد التعديل')
            ->assertJsonPath('trainingMaterials.0.description', 'الوصف بعد التعديل')
            ->assertJsonPath('trainingMaterials.0.targetBranchId', 'female')
            ->assertJsonPath('trainingMaterials.0.attachments.0.displayName', 'الملف الأول بعد التعديل')
            ->assertJsonPath('trainingMaterials.0.attachments.1.displayName', 'ملف جديد')
            ->assertJsonCount(2, 'trainingMaterials.0.attachments');

        $this->assertDatabaseHas('training_materials', [
            'id' => $materialId,
            'title' => 'حقيبة بعد التعديل',
            'description' => 'الوصف بعد التعديل',
            'target_branch_code' => 'female',
        ]);

        $this->assertDatabaseMissing('media', [
            'model_type' => TrainingMaterial::class,
            'model_id' => $materialId,
            'name' => 'ملف ثان',
        ]);
    }
}
