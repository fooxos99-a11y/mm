import {
  submitPublicAssessment,
  submitPublicSatisfactionResponses,
} from '../../services/api';
import { MAX_STUDENT_ATTACHMENT_SIZE } from './courseViewConfig';

export default {
  setAnswer(questionId, value) {
    this.answers[questionId] = value;
    this.pageError = '';
  },
  setSatisfactionRating(questionId, value) {
    this.satisfactionAnswers[questionId] = { ratingValue: value, textValue: '' };
    this.satisfactionError = '';
  },
  setSatisfactionText(questionId, value) {
    this.satisfactionAnswers[questionId] = { ratingValue: null, textValue: value };
    this.satisfactionError = '';
  },
  openAttachmentPreview(attachment) {
    this.previewAttachment = attachment;
    this.previewDialogOpen = true;
  },
  closePreview() {
    this.previewDialogOpen = false;
    this.previewAttachment = null;
  },
  async handleStudentFileSelect(questionId, event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    if (file.size > MAX_STUDENT_ATTACHMENT_SIZE) {
      this.pageError = 'حجم الملف المرفوع كبير جدًا. الحد الأقصى 5 ميجابايت.';
      event.target.value = '';
      return;
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error('file-read-failed'));
      reader.readAsDataURL(file);
    }).catch(() => '');

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
  validateSatisfactionAnswers() {
    for (const question of this.satisfactionQuestions) {
      if (!question.isRequired) continue;
      if (question.type === 'rating' && this.satisfactionAnswers[question.id]?.ratingValue == null) {
        this.satisfactionError = 'أجب على جميع أسئلة الرضا الإلزامية.';
        return false;
      }
      if (question.type === 'text' && !(this.satisfactionAnswers[question.id]?.textValue || '').trim()) {
        this.satisfactionError = 'أجب على جميع أسئلة الرضا الإلزامية.';
        return false;
      }
    }

    this.satisfactionError = '';
    return true;
  },
  getSubmissionBlockReason() {
    if (!this.activeCourse) return 'لا توجد دورة مفعلة حاليًا.';
    if (!this.isAssessmentEnabled) return 'هذا الاختبار غير متاح لك الآن.';
    if (!this.student) return 'تعذر تحديد الطالب الحالي.';
    if (this.existingSubmission && !this.hasPendingPostSatisfaction) {
      return 'تم إرسال النتيجة مسبقًا، ولا يمكن إعادة الإرسال مرة أخرى.';
    }
    if (!this.existingSubmission && this.questions.some((question) => !(this.answers[question.id] || '').trim())) {
      return 'الرجاء إكمال جميع الأسئلة';
    }
    return '';
  },
  needsSatisfactionSubmission() {
    return this.resolvedAssessmentType === 'post' && this.satisfactionQuestions.length > 0 && !this.alreadySubmittedSatisfaction;
  },
  submitAssessmentAnswers() {
    return submitPublicAssessment({
      courseId: this.activeCourse.id,
      assessmentType: this.resolvedAssessmentType,
      studentName: this.student.name,
      loginId: this.student.loginId,
      answers: this.questions.map((question) => ({
        questionId: question.id,
        value: this.answers[question.id] || '',
        fileName: this.files[question.id]?.name || null,
        fileType: this.files[question.id]?.type || null,
        file: this.files[question.id]?.file || null,
        fileDataUrl: null,
      })),
    });
  },
  submitSatisfactionAnswers() {
    return submitPublicSatisfactionResponses(this.satisfactionQuestions.map((question) => ({
      courseId: this.activeCourse.id,
      questionId: question.id,
      loginCode: this.student.loginId,
      studentName: this.student.name,
      ratingValue: question.type === 'rating' ? (this.satisfactionAnswers[question.id]?.ratingValue ?? null) : null,
      textValue: question.type === 'text' ? (this.satisfactionAnswers[question.id]?.textValue || '') : '',
    })));
  },
  async handleSubmit() {
    const blockReason = this.getSubmissionBlockReason();
    if (blockReason) {
      this.pageError = blockReason;
      return;
    }
    if (this.needsSatisfactionSubmission() && !this.validateSatisfactionAnswers()) return;

    this.submitting = true;
    try {
      if (!this.existingSubmission) await this.submitAssessmentAnswers();
      if (this.needsSatisfactionSubmission()) await this.submitSatisfactionAnswers();

      this.pageError = '';
      this.satisfactionError = '';
      this.answers = {};
      this.files = {};
      this.satisfactionAnswers = {};
      this.resetKey += 1;
      this.publicSnapshot = await this.fetchPublicSnapshotWithTimeout();
    } catch (error) {
      this.pageError = error?.response?.data?.message || error?.message || 'تعذر إرسال الاختبار.';
    } finally {
      this.submitting = false;
    }
  },
};
