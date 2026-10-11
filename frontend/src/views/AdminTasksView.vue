<template>
  <div
    class="tasks-page"
    :class="{ 'tasks-page--embedded': embedded }"
  >
    <v-container
      class="tasks-page__container"
      :class="{ 'py-8 py-md-10': !embedded }"
    >
      <v-alert
        v-if="dashboardError"
        type="error"
        outlined
        class="tasks-page__alert mb-6"
      >
        {{ dashboardError }}
      </v-alert>

      <AdminAssessmentView
        ref="assessmentPanel"
        embedded
        assessment-type-override="tasks"
        :clock-timestamp="clockTimestamp"
        :skip-initial-load="true"
        @assessment-topbar-state="$emit('assessment-topbar-state', $event)"
      />
    </v-container>
  </div>
</template>

<script src="../features/tasks/adminTasksView.js"></script>
