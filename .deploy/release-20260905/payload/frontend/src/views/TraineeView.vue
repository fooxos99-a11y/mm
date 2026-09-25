<template>
  <v-container class="py-8">
    <v-card
      outlined
      class="pa-6 page-card"
    >
      <div class="d-flex flex-wrap align-center justify-space-between mb-4 page-gap">
        <div>
          <div class="text-overline mb-2">
            المعلم
          </div>
          <h1 class="text-h5 font-weight-bold">
            واجهة المعلم
          </h1>
        </div>
        <AppButton
          variant="plain"
          :to="{ name: 'home' }"
        >
          الرئيسية
        </AppButton>
      </div>

      <v-row>
        <v-col
          cols="12"
          md="6"
        >
          <v-card
            outlined
            class="pa-4 item-card fill-height"
          >
            <div class="font-weight-bold mb-3">
              قوالب المهام
            </div>
            <div
              v-if="taskTemplates.length === 0"
              class="text-body-2 text--secondary"
            >
              لا توجد قوالب بعد.
            </div>
            <div
              v-for="template in taskTemplates"
              :key="template.id"
              class="mb-3"
            >
              <div class="font-weight-medium">
                {{ template.name }}
              </div>
              <div class="text-caption text--secondary">
                {{ template.createdAt }}
              </div>
            </div>
          </v-card>
        </v-col>
        <v-col
          cols="12"
          md="6"
        >
          <v-card
            outlined
            class="pa-4 item-card fill-height"
          >
            <div class="font-weight-bold mb-3">
              الدورات النشطة
            </div>
            <div
              v-if="activeCourses.length === 0"
              class="text-body-2 text--secondary"
            >
              لا توجد دورات نشطة.
            </div>
            <div
              v-for="course in activeCourses"
              :key="course.id"
              class="mb-3"
            >
              <div class="font-weight-medium">
                {{ course.title }}
              </div>
              <div class="text-caption text--secondary">
                {{ course.entityType === 'task' ? 'مهمة' : 'دورة' }}
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-card>
  </v-container>
</template>

<script>
import { mapActions, mapState } from 'vuex';
import { AppButton } from '../components/ui';

export default {
  name: 'TraineeView',
  components: {
    AppButton,
  },
  computed: {
    ...mapState(['dashboardSnapshot']),
    taskTemplates() {
      return this.dashboardSnapshot?.taskTemplates || [];
    },
    activeCourses() {
      return (this.dashboardSnapshot?.courses || []).filter((course) => course.isActive);
    },
  },
  created() {
    this.loadDashboardSnapshot();
  },
  methods: {
    ...mapActions(['loadDashboardSnapshot']),
  },
};
</script>

<style scoped>
.page-card,
.item-card {
  border-radius: 24px;
}

.page-gap {
  gap: 12px;
}
</style>
