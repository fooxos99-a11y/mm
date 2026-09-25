import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveTrainingMaterialPreviewKind,
  resolveTrainingMaterialPreviewSource,
  resolveTrainingMaterialFileName,
} from '../src/features/training-materials/trainingMaterialPreview.mjs';

test('training material preview recognizes supported media types', () => {
  assert.equal(resolveTrainingMaterialPreviewKind({ mimeType: 'image/png' }), 'image');
  assert.equal(resolveTrainingMaterialPreviewKind({ mimeType: 'video/mp4' }), 'video');
  assert.equal(resolveTrainingMaterialPreviewKind({ mimeType: 'audio/mpeg' }), 'audio');
  assert.equal(resolveTrainingMaterialPreviewKind({ mimeType: 'application/pdf' }), 'document');
  assert.equal(resolveTrainingMaterialPreviewKind({ mimeType: 'application/zip' }), 'other');
});

test('preview file names and sources remain usable when metadata is missing', () => {
  assert.equal(resolveTrainingMaterialFileName(), 'ملف');
  assert.equal(resolveTrainingMaterialFileName({ name: 'notes.pdf' }), 'notes.pdf');
  assert.equal(resolveTrainingMaterialFileName({ name: 'stored', originalName: 'original.pdf' }), 'original.pdf');
  assert.equal(resolveTrainingMaterialPreviewSource(), '');
  assert.equal(resolveTrainingMaterialPreviewSource({ kind: 'youtube' }), '');
  assert.equal(resolveTrainingMaterialPreviewSource({ kind: 'document', objectUrl: 'blob:preview' }), 'blob:preview');
});

test('youtube preview uses its embed URL', () => {
  const attachment = {
    type: 'youtube',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  };

  assert.equal(resolveTrainingMaterialPreviewKind(attachment), 'youtube');
  assert.equal(resolveTrainingMaterialPreviewSource({
    attachment,
    kind: 'youtube',
    objectUrl: '',
  }), attachment.embedUrl);
});
