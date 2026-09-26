<template>
  <div>
    <AppDialog
      :value="linksOpen"
      max-width="760"
      @input="$emit('update:links-open', $event)"
    >
      <v-card class="dashboard-dialog-card pa-5">
        <div class="dashboard-links-dialog-grid">
          <article
            v-for="item in links"
            :key="item.id"
            class="dashboard-links-dialog-card"
          >
            <div class="dashboard-links-dialog-card__title">
              {{ item.title }}
            </div>
            <div class="dashboard-links-dialog-card__url">
              {{ item.url }}
            </div>
            <AppButton
              variant="secondary"
              class="dashboard-links-dialog-card__copy"
              @click="$emit('copy-link', item)"
            >
              <span>نسخ الرابط</span><v-icon small>
                mdi-content-copy
              </v-icon>
            </AppButton>
          </article>
        </div>
      </v-card>
    </AppDialog>

    <AppDialog
      :value="addOpen"
      max-width="640"
      @input="$emit('update:add-open', $event)"
    >
      <v-card class="dashboard-dialog-card pa-5">
        <div class="dashboard-dialog-card__header">
          <div>
            <div class="dashboard-dialog-card__eyebrow">
              استبيان الرضا
            </div>
            <h2 class="dashboard-dialog-card__title">
              إضافة سؤال جديد
            </h2>
          </div>
        </div>
        <div class="dashboard-satisfaction-dialog__note">
          سيتم إضافة هذا السؤال تلقائيًا لجميع الاختبارات البعدية في الدورات المفعلة.
        </div>
        <AppTextField
          :value="questionDraft.prompt"
          label="نص السؤال"
          dense
          outlined
          class="dashboard-dialog-card__field"
          @input="$emit('update-prompt', $event)"
        />
        <AppSelect
          :value="questionDraft.type"
          :items="questionTypes"
          item-text="label"
          item-value="value"
          label="نوع السؤال"
          dense
          outlined
          class="dashboard-dialog-card__field"
          @input="$emit('update-type', $event)"
        />
        <v-switch
          :model-value="questionDraft.isRequired"
          color="primary"
          inset
          hide-details
          class="dashboard-satisfaction-dialog__switch"
          label="سؤال إلزامي"
          @update:model-value="$emit('update-required', $event)"
        />
        <AppDialogFooter class="dashboard-dialog-card__actions">
          <AppButton
            variant="secondary"
            @click="$emit('close-add')"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="primary"
            :loading="submitting"
            @click="$emit('submit-add')"
          >
            إضافة
          </AppButton>
        </AppDialogFooter>
      </v-card>
    </AppDialog>

    <AppDialog
      :value="deleteOpen"
      max-width="640"
      @input="$emit('update:delete-open', $event)"
    >
      <v-card class="dashboard-dialog-card pa-5">
        <div class="dashboard-dialog-card__header">
          <div>
            <div class="dashboard-dialog-card__eyebrow">
              استبيان الرضا
            </div>
            <h2 class="dashboard-dialog-card__title">
              حذف سؤال
            </h2>
          </div>
        </div>
        <div
          v-if="!questionOptions.length"
          class="dashboard-empty-state"
        >
          لا توجد أسئلة متاحة للحذف.
        </div>
        <template v-else>
          <div class="dashboard-satisfaction-dialog__note">
            سيتم حذف السؤال المحدد من جميع الدورات التي تحتوي على نفس النص ونفس النوع.
          </div>
          <AppSelect
            :value="selectedDeleteKey"
            :items="questionOptions"
            item-text="label"
            item-value="value"
            label="السؤال"
            dense
            outlined
            class="dashboard-dialog-card__field"
            @input="$emit('update:selected-delete-key', $event)"
          />
          <AppDialogFooter class="dashboard-dialog-card__actions">
            <AppButton
              variant="secondary"
              @click="$emit('close-delete')"
            >
              إلغاء
            </AppButton>
            <AppButton
              variant="danger"
              :loading="deleting"
              @click="$emit('confirm-delete')"
            >
              حذف
            </AppButton>
          </AppDialogFooter>
        </template>
      </v-card>
    </AppDialog>
  </div>
</template>

<script>
import {
  AppButton, AppDialog, AppDialogFooter, AppSelect, AppTextField,
} from '../ui';

export default {
  name: 'DashboardUtilityDialogs',
  components: { AppButton, AppDialog, AppDialogFooter, AppSelect, AppTextField },
  props: {
    linksOpen: Boolean,
    links: { type: Array, default: () => [] },
    addOpen: Boolean,
    deleteOpen: Boolean,
    questionDraft: { type: Object, required: true },
    questionTypes: { type: Array, default: () => [] },
    questionOptions: { type: Array, default: () => [] },
    selectedDeleteKey: { type: String, default: '' },
    submitting: Boolean,
    deleting: Boolean,
  },
  emits: [
    'update:links-open',
    'copy-link',
    'update:add-open',
    'update-prompt',
    'update-type',
    'update-required',
    'close-add',
    'submit-add',
    'update:delete-open',
    'update:selected-delete-key',
    'close-delete',
    'confirm-delete',
  ],
};
</script>
