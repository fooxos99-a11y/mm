import { submitPublicAssessment } from '../../services/api';
import { hasMeaningfulDocumentContent } from '../../utils/documentContent';

const readTaskFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
  reader.onerror = () => reject(new Error('task-file-read-failed'));
  reader.readAsDataURL(file);
});

export default {
  selectTask(taskId) {
    this.selectedTaskId = taskId;
    this.pageError = '';
  },
  setAnswer(questionId, value) {
    this.answers[questionId] = value;
    this.pageError = '';
  },
  setDocumentAnswer(value) {
    if (!this.documentQuestion) {
      return;
    }

    this.answers[this.documentQuestion.id] = value;
    this.pageError = '';
  },
  resolveTaskVideo(rawUrl) {
    const value = String(rawUrl || '').trim();

    if (!value) {
      return null;
    }

    const directVideoPattern = /\.(mp4|webm|ogg)(\?.*)?$/i;

    if (directVideoPattern.test(value)) {
      return {
        kind: 'video',
        src: value,
      };
    }

    try {
      const parsed = new URL(value);
      const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
      let videoId = '';

      if (host === 'youtu.be') {
        videoId = parsed.pathname.replace(/^\//, '').split('/')[0] || '';
      } else if (host.endsWith('youtube.com')) {
        if (parsed.pathname === '/watch') {
          videoId = parsed.searchParams.get('v') || '';
        } else if (parsed.pathname.startsWith('/embed/')) {
          videoId = parsed.pathname.split('/embed/')[1]?.split('/')[0] || '';
        } else if (parsed.pathname.startsWith('/shorts/')) {
          videoId = parsed.pathname.split('/shorts/')[1]?.split('/')[0] || '';
        }
      }

      if (videoId) {
        return {
          kind: 'embed',
          src: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`,
        };
      }
    } catch (error) {
      return null;
    }

    return null;
  },
  openAttachmentPreview(attachment) {
    this.previewAttachment = attachment;
    this.previewDialogOpen = true;
  },
  closePreview() {
    this.previewDialogOpen = false;
    this.previewAttachment = null;
  },
  handleFileSelect(questionId, event) {
    const file = event?.target?.files?.[0];

    if (!file) {
      return;
    }

    this.clearSelectedFile(questionId);

    let previewUrl = '';
    try {
      previewUrl = URL.createObjectURL(file);
    } catch (error) {
      previewUrl = '';
    }

    this.files[questionId] = {
      file,
      name: file.name,
      type: file.type,
      previewUrl,
    };
    this.pageError = '';
    event.target.value = '';
  },
  clearSelectedFile(questionId) {
    const currentFile = this.files[questionId];

    if (currentFile?.previewUrl) {
      URL.revokeObjectURL(currentFile.previewUrl);
    }
  },
  clearSelectedFiles() {
    Object.keys(this.files || {}).forEach((questionId) => {
      this.clearSelectedFile(questionId);
    });
  },
  async buildSubmissionAnswers(questionList) {
    return Promise.all(questionList.map(async (question) => {
      const selectedFile = this.files[question.id] || null;
      let fileDataUrl = null;

      if (selectedFile?.file) {
        fileDataUrl = await readTaskFileAsDataUrl(selectedFile.file);

        if (!fileDataUrl) {
          throw new Error('تعذر قراءة المرفق. جرب ملفا أصغر أو أغلقه من البرامج الأخرى ثم أعد اختياره.');
        }
      }

      return {
        questionId: question.id,
        value: this.selectedTask.taskMode === 'document'
          ? this.documentAnswer
          : (this.answers[question.id] || ''),
        fileName: selectedFile?.name || null,
        fileType: selectedFile?.type || null,
        fileDataUrl,
      };
    }));
  },
  async handleSubmit() {
    if (!this.selectedTask || !this.student) {
      this.pageError = 'سجّل الدخول أولًا.';
      return;
    }

    if (this.existingSubmission) {
      this.pageError = 'تم إرسال هذه المهمة الأدائية مسبقًا.';
      return;
    }

    if (!this.taskIsEnabled) {
      this.pageError = 'هذه المهمة الأدائية غير متاحة لك الآن.';
      return;
    }

    if (this.selectedTask.taskMode === 'document') {
      if (!this.documentQuestion || !hasMeaningfulDocumentContent(this.documentAnswer)) {
        this.pageError = 'اكتب محتوى المهمة الأدائية أولًا.';
        return;
      }
    } else {
      for (const question of this.taskQuestions) {
        if (!(this.answers[question.id] || '').trim()) {
          this.pageError = 'الرجاء إكمال جميع الأسئلة';
          return;
        }
      }
    }

    this.submitting = true;

    try {
      const questionList = this.selectedTask.taskMode === 'document'
        ? [this.documentQuestion].filter(Boolean)
        : this.taskQuestions;

      const answers = await this.buildSubmissionAnswers(questionList);

      await submitPublicAssessment({
        courseId: this.selectedTask.id,
        assessmentType: 'tasks',
        studentName: this.student.name,
        loginId: this.student.loginId,
        answers,
      });

      this.pageError = '';
      this.publicSnapshot = Object.freeze(await this.fetchPublicSnapshotWithTimeout());
    } catch (error) {
      this.pageError = error?.response?.data?.message || error?.message || 'تعذر إرسال المهمة الأدائية.';
    } finally {
      this.submitting = false;
    }
  },
};
