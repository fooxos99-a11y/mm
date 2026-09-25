<template>
  <div
    class="admin-templates"
    :class="{ 'admin-templates--embedded': embedded }"
  >
    <section class="admin-templates__card">
      <h2 class="admin-templates__title">
        قوالب الإشعارات
      </h2>

      <div
        v-if="!hasCourses"
        class="admin-templates__empty"
      >
        لا توجد دورة متاحة حاليًا.
      </div>

      <div
        v-else
        class="admin-templates__grid"
      >
        <div class="admin-templates__field">
          <label class="admin-templates__label">قالب القبلي</label>
          <v-textarea
            v-model="templateDraft.pre"
            rows="4"
            outlined
            hide-details
            class="admin-templates__input admin-templates__input--textarea"
          />
        </div>

        <div class="admin-templates__field">
          <label class="admin-templates__label">قالب البعدي</label>
          <v-textarea
            v-model="templateDraft.post"
            rows="4"
            outlined
            hide-details
            class="admin-templates__input admin-templates__input--textarea"
          />
        </div>

        <div class="admin-templates__field admin-templates__field--full">
          <label class="admin-templates__label">قالب المهام</label>
          <v-textarea
            v-model="templateDraft.tasks"
            rows="4"
            outlined
            hide-details
            class="admin-templates__input admin-templates__input--textarea"
          />
        </div>

        <div class="admin-templates__field admin-templates__field--full">
          <label class="admin-templates__label">قالب الاختبار النهائي</label>
          <v-textarea
            v-model="templateDraft.finalExam"
            rows="4"
            outlined
            hide-details
            class="admin-templates__input admin-templates__input--textarea"
          />
        </div>
      </div>

      <div class="admin-templates__actions">
        <AppButton
          variant="primary"
          :loading="submitting"
          :disabled="!hasCourses"
          @click="saveTemplates"
        >
          حفظ
        </AppButton>
      </div>
    </section>
  </div>
</template>

<script>
import { mapActions, mapState } from 'vuex';
import { AppButton } from '../components/ui';

export default {
  name: 'AdminTemplatesView',
  components: {
    AppButton,
  },
  props: {
    embedded: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      submitting: false,
      templateDraft: {
        pre: '',
        post: '',
        tasks: '',
        finalExam: '',
      },
    };
  },
  computed: {
    ...mapState(['dashboardSnapshot']),
    courses() {
      return Array.isArray(this.dashboardSnapshot?.courses) ? this.dashboardSnapshot.courses : [];
    },
    hasCourses() {
      return this.courses.length > 0;
    },
    sharedTemplatesSource() {
      return this.courses[0] || null;
    },
    sharedFinalExamTemplate() {
      return this.dashboardSnapshot?.finalExamSettings?.male?.notificationTemplate
        || this.dashboardSnapshot?.finalExamSettings?.female?.notificationTemplate
        || '';
    },
  },
  watch: {
    sharedTemplatesSource: {
      immediate: true,
      handler(course) {
        const templates = course?.assessmentNotificationTemplates || {};
        this.templateDraft = {
          pre: templates.pre || '',
          post: templates.post || '',
          tasks: templates.tasks || '',
          finalExam: this.sharedFinalExamTemplate || '',
        };
      },
    },
    sharedFinalExamTemplate(nextValue) {
      this.templateDraft = {
        ...this.templateDraft,
        finalExam: nextValue || '',
      };
    },
  },
  methods: {
    ...mapActions(['updateCourse', 'updateFinalExamNotificationTemplate']),
    async saveTemplates() {
      if (!this.hasCourses) {
        return;
      }

      this.submitting = true;

      try {
        const sharedTemplates = {
          pre: this.templateDraft.pre || '',
          post: this.templateDraft.post || '',
          tasks: this.templateDraft.tasks || '',
        };

        await Promise.all([
          ...this.courses.map((course) => this.updateCourse({
            courseId: course.id,
            updates: {
              assessmentNotificationTemplates: sharedTemplates,
            },
          })),
          this.updateFinalExamNotificationTemplate({
            branchCode: 'male',
            notificationTemplate: this.templateDraft.finalExam || '',
          }),
          this.updateFinalExamNotificationTemplate({
            branchCode: 'female',
            notificationTemplate: this.templateDraft.finalExam || '',
          }),
        ]);
        this.$toast.success('تم حفظ القوالب');
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر حفظ القوالب');
      } finally {
        this.submitting = false;
      }
    },
  },
};
</script>

<style scoped>
.admin-templates {
  display: block;
}

.admin-templates__card {
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 250, 250, 0.96) 100%);
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.08);
}

.admin-templates__title {
  margin: 0 0 18px;
  color: #0f3554;
  font-size: 1.7rem;
  font-weight: 900;
}

.admin-templates__card {
  padding: 24px;
}

.admin-templates__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.admin-templates__field {
  display: grid;
  gap: 8px;
}

.admin-templates__field--full {
  grid-column: 1 / -1;
}

.admin-templates__label {
  color: #0f3554;
  font-size: 0.95rem;
  font-weight: 800;
}

.admin-templates__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.admin-templates__empty {
  margin-top: 16px;
  color: #6b7f90;
  font-size: 0.98rem;
  font-weight: 700;
}

@media (max-width: 860px) {
  .admin-templates__grid {
    grid-template-columns: 1fr;
  }

  .admin-templates__field--full {
    grid-column: auto;
  }
}
</style>
