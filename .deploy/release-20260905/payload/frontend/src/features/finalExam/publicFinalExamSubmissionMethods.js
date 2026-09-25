import { submitPublicFinalExam } from '../../services/api';
import {
  MAX_FINAL_EXAM_ATTACHMENT_SIZE,
  finalExamAnswersMatch,
} from './publicFinalExamModel.mjs';

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
  reader.onerror = () => reject(new Error('file-read-failed'));
  reader.readAsDataURL(file);
});

export default {
  setAnswer(questionId, value) {
    this.answers[questionId] = value;
    this.pageError = '';
  },
  openAttachmentPreview(attachment) {
    this.previewAttachment = attachment;
    this.previewDialogOpen = true;
  },
  closePreview() {
    this.previewDialogOpen = false;
    this.previewAttachment = null;
  },
  isAnswerCorrect(correctAnswer, answer) {
    return finalExamAnswersMatch(correctAnswer, answer);
  },
  async handleFileSelect(questionId, event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    if (file.size > MAX_FINAL_EXAM_ATTACHMENT_SIZE) {
      this.pageError = 'حجم الملف المرفوع كبير جدًا. الحد الأقصى 5 ميجابايت.';
      event.target.value = '';
      return;
    }

    const dataUrl = await readFileAsDataUrl(file).catch(() => '');
    if (!dataUrl) {
      this.pageError = 'تعذر قراءة الملف المرفوع.';
      event.target.value = '';
      return;
    }

    this.files[questionId] = {
      name: file.name,
      type: file.type,
      dataUrl,
      file,
    };
    this.pageError = '';
    event.target.value = '';
  },
  async handleSubmit() {
    if (!this.student || !this.isEnabled) {
      this.pageError = 'الاختبار النهائي غير متاح حاليًا.';
      return;
    }
    if (this.existingSubmission) {
      this.pageError = 'تم إرسال الاختبار النهائي مسبقًا.';
      return;
    }
    if (this.questions.some((question) => !String(this.answers[question.id] || '').trim())) {
      this.pageError = 'الرجاء إكمال جميع الأسئلة';
      return;
    }

    this.submitting = true;
    try {
      await submitPublicFinalExam({
        branchCode: this.branchCode,
        studentName: this.student.name,
        loginCode: this.student.loginId,
        answers: this.questions.map((question) => ({
          questionId: question.id,
          value: this.answers[question.id] || '',
          fileName: this.files[question.id]?.name || null,
          fileType: this.files[question.id]?.type || null,
          file: this.files[question.id]?.file || null,
          fileDataUrl: null,
        })),
      });
      this.pageError = '';
      this.answers = {};
      this.files = {};
      this.resetKey += 1;
      this.publicSnapshot = await this.fetchPublicSnapshotWithTimeout();
    } catch (error) {
      this.pageError = error?.response?.data?.message || error?.message || 'تعذر إرسال الاختبار النهائي.';
    } finally {
      this.submitting = false;
    }
  },
};
