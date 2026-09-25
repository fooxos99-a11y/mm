<template>
  <div class="home-page-settings">
    <v-alert
      v-if="errorMessage"
      type="error"
      dense
      text
      class="mb-4"
    >
      {{ errorMessage }}
    </v-alert>
    <v-alert
      v-if="successMessage"
      type="success"
      dense
      text
      class="mb-4"
    >
      {{ successMessage }}
    </v-alert>

    <div class="home-page-settings__sections">
      <HomeIntroSettings
        :form="form"
        @delete-item="deleteItem"
      />
      <HomeAboutSettings
        :form="form"
        @delete-item="deleteItem"
      />
      <HomeIndicatorsSettings :form="form" />
      <HomeProgramStructureSettings
        :form="form"
        @delete-item="deleteItem"
      />
      <HomeRequirementsSettings
        :form="form"
        @delete-item="deleteItem"
      />
      <HomeScheduleSettings
        :form="form"
        @delete-item="deleteItem"
      />
      <HomeFooterSettings :form="form" />
    </div>

    <div class="home-page-settings__footer">
      <AppButton
        :loading="saving"
        @click="saveContent"
      >
        حفظ نصوص رخصة ممارس
      </AppButton>
    </div>

    <HomeSettingsDeleteDialog
      :value="deleteDialogOpen"
      :loading="saving"
      @input="handleDeleteDialogInput"
      @confirm="confirmDeleteItem"
    />
  </div>
</template>

<script src="../features/controllers/AdminHomePageSettingsView.js"></script>

<style src="../styles/views/admin-home-page-settings.css"></style>
