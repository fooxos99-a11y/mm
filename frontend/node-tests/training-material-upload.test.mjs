import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_TRAINING_FILE_BYTES, validateTrainingAttachmentSizes, resolveTrainingUploadError } from '../src/features/training-materials/trainingMaterialUpload.mjs';

test('accepts 100 MiB and existing links; rejects oversized files before uploading', () => {
  assert.equal(validateTrainingAttachmentSizes([{ url: 'https://youtu.be/test' }, { file: { size: MAX_TRAINING_FILE_BYTES } }]), '');
  assert.match(validateTrainingAttachmentSizes([{ file: { name: 'guide.pdf', size: MAX_TRAINING_FILE_BYTES + 1 } }]), /guide.pdf.*100/);
});

test('upload errors preserve Arabic server reasons and distinguish transport failures', () => {
  const reason = 'تعذر كتابة الملف على الخادم. تواصل مع الدعم.';
  assert.equal(resolveTrainingUploadError({ response: { status: 422, data: { errors: { 'attachments.0.file': [reason] } } } }), reason);
  assert.match(resolveTrainingUploadError({ response: { status: 413, data: '<html>Too large</html>' } }), /مجتمعة/);
  assert.match(resolveTrainingUploadError({ code: 'ECONNABORTED' }), /مهلة/);
  assert.match(resolveTrainingUploadError({ code: 'ERR_NETWORK' }), /الاتصال/);
  assert.match(resolveTrainingUploadError({ response: { status: 403 } }), /صلاحية/);
  assert.match(resolveTrainingUploadError({ response: { status: 401 } }), /جلسة/);
  assert.match(resolveTrainingUploadError({ response: { status: 500, data: { message: 'SQLSTATE internal path' } } }), /خطأ في الخادم/);
  assert.match(resolveTrainingUploadError({ response: { status: 422, data: { errors: { 'attachments.0.file': ['The attachments.0.file failed to upload.'] } } } }), /لم يحدد الخادم السبب/);
});
