<template>
  <div
    class="registration-admin"
    :class="{ 'registration-admin--embedded': embedded }"
  >
    <RegistrationFieldsDialog
      v-model="fieldsDialogOpen"
      :fields="registrationFields"
      :loading="fieldsSubmitting || loading"
      @save="saveRegistrationFields"
    />

    <RegistrationAcceptanceDialog
      v-model="acceptanceDialogOpen"
      :request="acceptanceRequest"
      :fields="registrationFields"
      :branches="branchOptions"
      :loading="Boolean(busyRequestId)"
      @accept="acceptRequest"
    />

    <section
      v-if="!embedded"
      class="registration-admin__hero"
    >
      <div>
        <div class="registration-admin__eyebrow">
          الإعدادات
        </div>
        <h1 class="registration-admin__title">
          التسجيل
        </h1>
        <p class="registration-admin__description">
          افتح أو أغلق رابط التسجيل، وراجع الطلبات وقم بقبولها أو رفضها مباشرة.
        </p>
      </div>

      <div class="registration-admin__hero-actions">
        <AppButton
          variant="secondary"
          @click="openFieldsDialog"
        >
          تعديل بيانات التسجيل
        </AppButton>
        <AppButton
          variant="secondary"
          @click="copyRegistrationLink"
        >
          نسخ الرابط
        </AppButton>
        <AppButton
          v-if="registrationUrl"
          variant="primary"
          :href="registrationUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          فتح الرابط
        </AppButton>
      </div>
    </section>

    <section class="registration-admin__requests-card">
      <div class="registration-admin__section-header">
        <div>
          <h2 class="registration-admin__section-title">
            الطلبات
          </h2>
          <div class="registration-admin__section-caption">
            الطلاب
          </div>
        </div>
      </div>

      <div
        v-if="loading"
        class="registration-admin__empty"
      >
        جارٍ تحميل بيانات التسجيل...
      </div>

      <div
        v-else-if="pendingRequests.length === 0"
        class="registration-admin__empty"
      >
        لا توجد طلبات طلاب معلقة حاليًا.
      </div>

      <div
        v-else
        class="registration-admin__requests-panel"
      >
        <div class="registration-admin__requests-panel-head">
          <span>بيانات الطلب</span>
          <span>الإجراء</span>
        </div>

        <article
          v-for="request in pendingRequests"
          :key="request.id"
          class="registration-admin__request-row"
        >
          <div class="registration-admin__request-main">
            <div class="registration-admin__request-head">
              <div>
                <h3 class="registration-admin__request-name">
                  {{ request.name }}
                </h3>
                <div class="registration-admin__request-meta">
                  الجنس: {{ genderLabel(request.gender) }}
                </div>
                <div class="registration-admin__request-meta">
                  رقم الجوال: {{ request.phone || '--' }}
                </div>
                <div
                  v-if="request.branchId"
                  class="registration-admin__request-meta"
                >
                  الفرع: {{ branchLabel(request.branchId) }}
                </div>
                <div
                  v-for="answer in requestAnswerList(request)"
                  :key="answer.label"
                  class="registration-admin__request-meta"
                >
                  {{ answer.label }}: {{ answer.value || '--' }}
                </div>
              </div>

              <span
                class="registration-admin__request-status"
                :class="`registration-admin__request-status--${request.status}`"
              >
                {{ statusLabel(request.status) }}
              </span>
              <AppRawButton
                v-if="request.status === 'pending' && selectedRequestId === request.id"
                type="button"
                class="registration-admin__request-close"
                :disabled="busyRequestId === request.id"
                title="إخفاء الطلب من نافذة التسجيل"
                aria-label="إخفاء الطلب من نافذة التسجيل"
                @click.stop="markRequestAccepted(request.id)"
              >
                <v-icon small>
                  mdi-close
                </v-icon>
              </AppRawButton>
            </div>

            <template v-if="request.status !== 'accepted'">
              <p
                v-if="request.note"
                class="registration-admin__request-note"
              >
                {{ request.note }}
              </p>

              <div class="registration-admin__request-dates">
                <span>أُرسل: {{ formatDate(request.createdAt) }}</span>
                <span v-if="request.reviewedAt">تمت المعالجة: {{ formatDate(request.reviewedAt) }}</span>
              </div>

              <div
                v-if="request.decisionReason"
                class="registration-admin__request-reason"
              >
                {{ request.decisionReason }}
              </div>
            </template>
          </div>

          <div
            v-if="request.status === 'pending'"
            class="registration-admin__request-actions"
            @click.stop
          >
            <AppButton
              variant="danger"
              :loading="busyRequestId === request.id && busyAction === 'reject'"
              :disabled="busyRequestId === request.id && busyAction !== 'reject'"
              @click="rejectRequest(request.id)"
            >
              رفض
            </AppButton>
            <AppButton
              variant="success"
              :loading="busyRequestId === request.id && busyAction === 'accept'"
              :disabled="busyRequestId === request.id && busyAction !== 'accept'"
              @click="openAcceptanceDialog(request)"
            >
              قبول
            </AppButton>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script src="../features/controllers/AdminRegistrationView.js"></script>

<style scoped src="../styles/views/admin-registration.css"></style>
