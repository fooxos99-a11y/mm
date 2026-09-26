import {
  setAssessmentAnswerManualScore,
  setFinalExamAnswerManualScore,
  setFinalExamManualScore,
  setTaskReviewStatus,
} from '../../services/api';
import { sanitizeRichTextHtml } from '../../utils/documentContent';
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
  downloadResultAsPdf() {
    const course = this.escapeHtml(this.selectedTaskResultCourse?.title
      || this.selectedResultsSectionLabel || 'النتيجة');
    const student = this.escapeHtml(this.selectedResultRow?.name || 'المعلم');
    const title = `${course}:${student}`;
    const cards = this.resultDetailCards.map((card, index) => {
      const answer = card.studentAnswerHtml
        ? `<div class="student-doc-answer ql-editor">${sanitizeRichTextHtml(card.studentAnswerHtml)}</div>`
        : `<p class="student-text-answer">${this.escapeHtml(card.studentAnswer || 'لا توجد إجابة')}</p>`;
      return `<div class="q-card"><div class="q-prompt">${index + 1}. ${this.escapeHtml(card.prompt)}
        <span class="q-pts">(${this.escapeHtml(card.points)} درجة)</span></div>
        <div class="q-answer-label">إجابة المعلم:</div>${answer}</div>`;
    }).join('');
    const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>${title}</title>
      <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#1a1a2e;background:#f0f4f8;padding:24px}
      .pdf-header{text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #3a5a8a}.pdf-header h1{font-size:22px;color:#1a3a5c}
      .q-card{background:#fff;border:1px solid #d0d8e8;border-radius:10px;padding:18px 20px;margin-bottom:20px;page-break-inside:avoid}
      .q-prompt{font-weight:700;font-size:15px;color:#1a3a5c;margin-bottom:10px}.q-pts{font-weight:400;color:#777;font-size:13px}
      .q-answer-label{font-size:12px;color:#888;margin-bottom:8px}.student-doc-answer{direction:rtl;text-align:right;font-size:14px;line-height:1.8;padding:10px;background:#fafafa;border-radius:6px}
      .student-doc-answer img{position:static!important;display:block;max-width:100%;height:auto;margin:10px auto;border-radius:8px}.student-text-answer{font-size:14px;color:#333;padding:8px 12px;background:#fafafa;border-right:3px solid #4e7fc5;border-radius:4px;margin-top:4px}
      @media print{body{background:#fff;padding:10px}.q-card{border:1px solid #ccc}}</style></head>
      <body><div class="pdf-header"><h1>${title}</h1></div>${cards}</body></html>`;
    const win = openHtmlDocument(html, { features: 'width=900,height=700' });
    if (!win) {
      this.$toast.error('يرجى السماح بفتح النوافذ المنبثقة لتحميل الملف');
      return;
    }
    // The page's CSP blocks inline scripts, so the print dialog is opened from here.
    win.addEventListener('load', () => setTimeout(() => win.print(), 400), { once: true });
  },
};
