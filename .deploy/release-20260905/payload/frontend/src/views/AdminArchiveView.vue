<template>
  <div
    class="admin-archive-view"
    :class="{ 'admin-archive-view--embedded': embedded }"
    dir="rtl"
  >
    <v-container class="admin-archive-view__container py-8 py-md-10">
      <ArchiveRecordsPanel
        :archive-id="selectedArchiveId"
        :archives="archives"
        :deleting-archive-id="deletingArchiveId"
        :search-query="studentSearchQuery"
        :show-workspace="canShowArchiveWorkspace"
        :title="displayedStudentsTitle"
        :headers="studentHeaders"
        :students="displayedStudents"
        :loading="loading || searchLoading"
        :empty-text="displayedStudentsEmptyText"
        :selected-student-id="selectedArchivedStudentId"
        :format-date="formatDate"
        @update:archive-id="selectedArchiveId = $event"
        @update:search-query="studentSearchQuery = $event"
        @archive-change="fetchArchiveData"
        @delete-archive="deleteArchive"
        @open-student="openArchivedStudentDetail"
      />

      <ArchivedStudentDetailDialog
        :value="detailDialogOpen"
        :loading="detailLoading"
        :detail="selectedArchivedStudentDetail"
        :completion-status="archivedStudentCompletionStatus"
        :completion-rows="archivedStudentCompletionRows"
        :registration-rows="archivedStudentRegistrationRows"
        :stats="archivedStudentStats"
        :format-score="formatScore"
        :format-date-time="formatDateTime"
        @input="detailDialogOpen = $event"
        @close="closeArchivedStudentDetailDialog"
      />

      <ArchiveManagementDialogs
        :create-open="createDialog"
        :archive-name="newArchiveName"
        :courses-count="newArchiveCoursesCount"
        :batch-type="newArchiveBatchType"
        :batch-type-options="batchTypeOptions"
        :saving="saving"
        :delete-open="deleteArchiveDialog"
        :delete-archive-name="pendingDeleteArchive ? pendingDeleteArchive.name : ''"
        :deleting="Boolean(deletingArchiveId)"
        :archive-all-open="archiveAllDialog"
        :archive-all-name="archiveAllName"
        :archive-all-batch-type="archiveAllBatchType"
        :student-open="addStudentDialog"
        :student-name="manualStudentName"
        @update:create-open="createDialog = $event"
        @update:archive-name="newArchiveName = $event"
        @update:courses-count="newArchiveCoursesCount = $event"
        @update:batch-type="newArchiveBatchType = $event"
        @create-close="closeCreateDialog"
        @create="createArchive"
        @update:delete-open="deleteArchiveDialog = $event"
        @delete-close="closeDeleteArchiveDialog"
        @delete-confirm="confirmDeleteArchive"
        @update:archive-all-open="archiveAllDialog = $event"
        @update:archive-all-name="archiveAllName = $event"
        @update:archive-all-batch-type="archiveAllBatchType = $event"
        @archive-all-close="closeArchiveAllDialog"
        @archive-all="archiveAllContent"
        @update:student-open="addStudentDialog = $event"
        @update:student-name="manualStudentName = $event"
        @student-close="closeAddStudentDialog"
        @student-add="archiveStudent"
      />
    </v-container>
  </div>
</template>

<script src="../features/controllers/AdminArchiveView.js"></script>

<style src="../styles/views/admin-archive.css"></style>
<style src="../styles/views/admin-archive-dialogs.css"></style>
