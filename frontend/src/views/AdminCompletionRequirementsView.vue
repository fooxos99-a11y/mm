<template>
  <div class="completion-page">
    <div class="completion-filter-bar">
      <label class="completion-field">
        <span>الحالة</span>
        <AppSelect
          v-model="statusFilter"
          aria-label="الحالة"
          :items="statusOptions"
          item-text="label"
          item-value="value"
          dense
          outlined
          hide-details
        />
      </label>
      <label class="completion-field">
        <span>{{ selectedBranch === 'female' ? 'المعلمة' : 'المعلم' }}</span>
        <AppSelect
          v-model="selectedStudentId"
          :aria-label="selectedBranch === 'female' ? 'المعلمة' : 'المعلم'"
          :items="studentOptions"
          item-text="label"
          item-value="value"
          placeholder="اختر الاسم"
          dense
          outlined
          hide-details
          clearable
        />
      </label>
    </div>

    <section class="completion-students">
      <CompletionRequirementsPanel
        :student="selectedStudent"
        :loading="loading"
        :empty-message="studentOptions.length ? 'اختر اسمًا لعرض تفاصيل الاجتياز.' : 'لا توجد أسماء مطابقة لهذا الفلتر.'"
      />
    </section>

    <AppDialog
      v-model="settingsDialogOpen"
      max-width="920"
    >
      <div class="completion-requirements-dialog">
        <AppDialogHeader title="متطلبات الاجتياز" />
        <AppDialogBody compact>
          <p class="completion-requirements-dialog__hint">
            تُحسب حالة الطلاب تلقائيًا بناءً على القيم المحفوظة للفرع.
          </p>
          <div class="completion-settings__grid">
            <label
              v-if="isAdmin"
              class="completion-field"
            >
              <span>الفرع</span>
              <AppSelect
                v-model="selectedBranch"
                aria-label="الفرع"
                :items="branchOptions"
                item-text="label"
                item-value="value"
                dense
                outlined
                hide-details
                @change="loadRequirements"
              />
            </label>
            <div
              v-else
              class="completion-field completion-field--readonly"
            >
              <span>الفرع</span>
              <strong>{{ payload.branchLabel }}</strong>
            </div>
            <label class="completion-field">
              <span>الحد الأدنى للحضور</span>
              <AppTextField
                v-model.number="settingsDraft.attendanceRequired"
                type="number"
                min="1"
                max="1000"
                dense
                outlined
                hide-details
                :disabled="payload.settings.isClosed"
              />
            </label>
            <label class="completion-field">
              <span>نسبة المهام المعتمدة</span>
              <AppTextField
                v-model.number="settingsDraft.tasksPercentageRequired"
                type="number"
                min="1"
                max="100"
                suffix="%"
                dense
                outlined
                hide-details
                :disabled="payload.settings.isClosed"
              />
            </label>
            <label class="completion-field">
              <span>نسبة الاختبار النهائي</span>
              <AppTextField
                v-model.number="settingsDraft.finalExamPercentageRequired"
                type="number"
                min="1"
                max="100"
                suffix="%"
                dense
                outlined
                hide-details
                :disabled="payload.settings.isClosed"
              />
            </label>
            <label class="completion-field">
              <span>الأجزاء المطلوبة</span>
              <AppTextField
                v-model.number="settingsDraft.quranPartsRequired"
                type="number"
                min="1"
                max="30"
                dense
                outlined
                hide-details
                :disabled="payload.settings.isClosed"
              />
            </label>
          </div>
        </AppDialogBody>
        <AppDialogFooter>
          <AppButton
            variant="secondary"
            @click="settingsDialogOpen = false"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="primary"
            :loading="saving"
            :disabled="payload.settings.isClosed"
            @click="saveSettings"
          >
            حفظ المتطلبات
          </AppButton>
        </AppDialogFooter>
      </div>
    </AppDialog>

    <AppDialog
      v-model="closeDialogOpen"
      max-width="520"
    >
      <div class="completion-confirm">
        <AppDialogHeader :title="payload.settings.isClosed ? 'إعادة فتح النتائج' : 'إغلاق واعتماد النتائج'" />
        <AppDialogBody>
          <p v-if="payload.settings.isClosed">
            ستعود الحالات غير المجتازة إلى «قيد الاستكمال» ويستأنف الحساب التلقائي.
          </p>
          <p v-else>
            سيتم اعتماد {{ payload.summary.passed }} مجتازًا، وتحويل {{ closingFailureCount }} إلى غير مجتاز.
          </p>
        </AppDialogBody>
        <AppDialogFooter>
          <AppButton
            variant="secondary"
            @click="closeDialogOpen = false"
          >
            إلغاء
          </AppButton>
          <AppButton
            :variant="payload.settings.isClosed ? 'secondary' : 'primary'"
            :loading="closing"
            @click="toggleResultsState"
          >
            تأكيد
          </AppButton>
        </AppDialogFooter>
      </div>
    </AppDialog>
  </div>
</template>

<script src="../features/controllers/AdminCompletionRequirementsView.js"></script>

<style scoped src="../styles/views/admin-completion-requirements.css"></style>
