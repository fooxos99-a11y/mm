<template>
  <div
    class="communications-page"
    :class="{ 'communications-page--embedded': embedded }"
  >
    <NotificationPrepPanel
      :message="notificationForm.message"
      :branch-id="notificationForm.targetBranchId"
      :branch-options="branchOptions"
      :students="notificationTargetStudents"
      :selected-ids="notificationForm.targetLoginIds"
      :selected-count="selectedNotificationTargetStudentsCount"
      :all-selected="allNotificationTargetStudentsSelected"
      :submitting="notificationSubmitting"
      @update:message="notificationForm.message = $event"
      @update:branch-id="notificationForm.targetBranchId = $event"
      @toggle-all="toggleAllNotificationTargets"
      @toggle-student="toggleNotificationTarget"
      @submit="submitNotification"
    />
  </div>
</template>

<script src="../features/controllers/AdminCommunicationsView.js"></script>

<style scoped src="../styles/views/admin-communications.css"></style>
<style scoped src="../styles/views/admin-communications-responsive.css"></style>
