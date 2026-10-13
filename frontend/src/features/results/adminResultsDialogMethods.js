import {
  setAssessmentAnswerManualScore,
  setFinalExamAnswerManualScore,
  setFinalExamManualScore,
  setTaskReviewStatus,
} from '../../services/api';
import { openHtmlDocument } from '../../utils/htmlWindow.mjs';

export default {
  openAttachmentPreview(attachment) {
    if (!attachment?.fileDataUrl) return;
    openHtmlDocument(`<!doctype html><html lang="ar" dir="rtl"><head>
      <meta charset="utf-8"><title>${this.escapeHtml(attachment.fileName || 'المرفق')}</title>
      <style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f8fafc;font-family:sans-serif}
      iframe,img,video{width:100%;height:100vh;border:0;object-fit:contain;background:#fff}
      a{color:#006c67;font-weight:800;font-size:18px}</style></head>
      <body>${this.renderAttachmentPreview(attachment)}</body></html>`, { features: 'noopener,noreferrer' });
  },
  escapeHtml(value) {
    return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  },
  escapeAttribute(value) { return this.escapeHtml(value).replaceAll('`', '&#96;'); },
  renderAttachmentPreview(attachment) {
    const source = this.escapeAttribute(attachment.fileDataUrl);
    const fileType = attachment.fileType || '';
    const fileName = this.escapeAttribute(attachment.fileName || 'المرفق');
    const fileLabel = this.escapeHtml(attachment.fileName || 'المرفق');
    if (fileType.startsWith('image/')) return `<img src="${source}" alt="${fileName}">`;
    if (fileType === 'application/pdf') return `<iframe src="${source}" title="${fileName}"></iframe>`;
    if (fileType.startsWith('video/')) return `<video src="${source}" controls></video>`;
    return `<a href="${source}" download="${fileName}">تحميل / فتح ${fileLabel}</a>`;
  },
  openResultDialog(row) {
    if (!row?.submission) return;
    this.selectedResultLoginId = row.key;
    this.resultDialogOpen = true;
  },
  closeResultDialog() {
    this.resultDialogOpen = false;
    this.selectedResultLoginId = '';
    this.answerScoreValues = {};
    this.savingAnswerId = '';
  },
  initializeAnswerScoreValues() {
    this.answerScoreValues = this.resultDetailCards.reduce((values, detail) => {
      if (detail.requiresManualReview && detail.answerId) {
        values[detail.answerId] = detail.manualPoints ?? '';
      }
      return values;
    }, {});
  },
  updateAnswerScoreDraft({ answerId, value }) {
    if (!answerId) return;
    this.answerScoreValues = { ...this.answerScoreValues, [answerId]: value };
  },
  async handleSaveAnswerScore(detail) {
    const submission = this.selectedResultRow?.submission;
    if (!submission?.id || !detail?.answerId) return;
    const rawScore = this.answerScoreValues[detail.answerId];
    const score = rawScore === '' || rawScore === null || rawScore === undefined ? null : Number(rawScore);
    const maxPoints = Number(detail.points || 0);
    if (score !== null && (!Number.isFinite(score) || score < 0 || score > maxPoints)) {
      this.$toast.error(`أدخل درجة من 0 إلى ${this.formatScore(maxPoints)}.`);
      return;
    }
    this.savingAnswerId = detail.answerId;
    try {
      const saveScore = this.isFinalExamResultsSection
        ? setFinalExamAnswerManualScore
        : setAssessmentAnswerManualScore;
      await saveScore(submission.id, detail.answerId, score);
      await this.reloadResultsAfterSave();
      this.initializeAnswerScoreValues();
      this.$toast.success(score === null ? 'تم إلغاء الدرجة اليدوية' : 'تم حفظ درجة الإجابة');
    } catch (error) {
      this.$toast.error(error?.response?.data?.message
        || Object.values(error?.response?.data?.errors || {}).flat()[0]
        || error?.message || 'تعذر حفظ درجة الإجابة');
    } finally {
      this.savingAnswerId = '';
    }
  },
  async handleSaveScore() {
    const submission = this.selectedResultRow?.submission;
    if (!submission?.id) return;
    this.isSavingScore = true;
    try {
      const score = this.scoreEditValue === null || this.scoreEditValue === ''
        ? null : Number(this.scoreEditValue);
      await setFinalExamManualScore(submission.id, score);
      await this.reloadResultsAfterSave();
    } catch (error) {
      this.$toast.error(error?.response?.data?.message || error?.message || 'تعذر حفظ الدرجة');
    } finally {
      this.isSavingScore = false;
    }
  },
  async handleTaskReview(status) {
    const submission = this.selectedResultRow?.submission;
    if (!submission?.id || !['approved', 'rejected'].includes(status)) return;
    this.isSavingScore = true;
    try {
      await setTaskReviewStatus(submission.id, status);
      await this.reloadResultsAfterSave();
      this.$toast.success(status === 'approved' ? 'تم اعتماد المهمة' : 'تم رفض المهمة');
    } catch (error) {
      this.$toast.error(error?.response?.data?.message || error?.message || 'تعذر تحديث حالة المهمة');
    } finally {
      this.isSavingScore = false;
    }
  },
};
