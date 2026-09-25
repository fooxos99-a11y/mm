<template>
  <div class="reciter-page">
    <v-container class="py-8 py-md-10">
      <section class="reciter-hero">
        <div>
          <div class="reciter-hero__eyebrow">
            المقرئ
          </div>
          <h1 class="reciter-hero__title">
            لوحة المقرئ
          </h1>
        </div>

        <img
          :src="$publicAsset('اللوقو-شفاف.webp')"
          alt="شعار المنصة"
          class="reciter-hero__logo"
        >
      </section>

      <div
        v-if="!hasReciterAccess"
        class="reciter-alert reciter-alert--error"
      >
        هذه الصفحة مخصصة لحسابات المقرئين فقط.
      </div>

      <div
        v-else-if="loading"
        class="reciter-alert"
      >
        جارٍ تحميل حساب المقرئ...
      </div>

      <div
        v-else-if="loadError"
        class="reciter-alert reciter-alert--error"
      >
        {{ loadError }}
      </div>

      <div
        v-else-if="!reciterAccount"
        class="reciter-alert"
      >
        لا توجد بيانات مرتبطة بهذا المقرئ حاليًا.
      </div>

      <template v-else>
        <section
          v-if="!sortedStudents.length"
          class="reciter-alert"
        >
          لا يوجد طلاب مرتبطون بهذا المقرئ.
        </section>

        <section
          v-else
          class="reciter-students"
        >
          <article
            v-for="student in sortedStudents"
            :key="student.id"
            class="reciter-student-card"
          >
            <div class="reciter-student-card__header">
              <div>
                <div class="reciter-student-card__name">
                  {{ student.name }}
                </div>
                <div class="reciter-student-card__meta">
                  رقم الدخول: {{ student.loginId }}
                </div>
              </div>
            </div>

            <div
              v-if="student.note"
              class="reciter-student-card__note"
            >
              {{ student.note }}
            </div>

            <div class="reciter-parts">
              <div class="reciter-parts__label">
                المقروء
              </div>

              <div class="reciter-parts__grid">
                <AppButton
                  v-for="part in visibleStudentParts(student)"
                  :key="`${student.id}-${part}`"
                  variant="plain"
                  class="reciter-part-circle"
                  :class="{ 'reciter-part-circle--active': student.completedParts.includes(part) }"
                  :disabled="savingKey === `${student.id}:${part}`"
                  @click="togglePart(student, part)"
                >
                  {{ part }}
                </AppButton>
              </div>
            </div>
          </article>
        </section>
      </template>
    </v-container>
  </div>
</template>

<script>
import { mapActions, mapState } from 'vuex';
import { AppButton } from '../components/ui';
import { fetchReciterByLoginCode, toggleStudentPart } from '../services/api';

export default {
  name: 'ReciterView',
  components: {
    AppButton,
  },
  data() {
    return {
      reciterAccount: null,
      loading: false,
      loadError: '',
      savingKey: '',
    };
  },
  computed: {
    ...mapState(['currentUser']),
    hasReciterAccess() {
      return this.currentUser?.role === 'reciter';
    },
    sortedStudents() {
      const students = [...(this.reciterAccount?.students || [])];

      return students.sort((left, right) => (left.name || '').localeCompare(right.name || '', 'ar'));
    },
  },
  watch: {
    'currentUser.loginCode': {
      immediate: true,
      handler() {
        this.loadReciterAccount();
      },
    },
  },
  methods: {
    ...mapActions(['loadDashboardSnapshot']),
    visibleStudentParts(student) {
      const limit = student?.branchId === 'female' ? 10 : 30;

      return Array.from({ length: limit }, (_, index) => index + 1);
    },
    async loadReciterAccount() {
      if (!this.hasReciterAccess || !this.currentUser?.loginCode) {
        this.reciterAccount = null;
        this.loadError = '';
        return;
      }

      this.loading = true;
      this.loadError = '';

      try {
        this.reciterAccount = await fetchReciterByLoginCode(this.currentUser.loginCode);
      } catch (error) {
        this.loadError = error?.response?.data?.message || 'تعذر تحميل بيانات المقرئ.';
        this.reciterAccount = null;
      } finally {
        this.loading = false;
      }
    },
    async togglePart(student, partNumber) {
      if (!this.reciterAccount) {
        return;
      }

      const active = student.completedParts.includes(partNumber);
      const nextParts = active
        ? student.completedParts.filter((part) => part !== partNumber)
        : [...student.completedParts, partNumber].sort((left, right) => left - right);
      const previousStudents = this.reciterAccount.students.map((item) => ({
        ...item,
        completedParts: [...item.completedParts],
      }));

      this.savingKey = `${student.id}:${partNumber}`;
      this.reciterAccount = {
        ...this.reciterAccount,
        students: this.reciterAccount.students.map((item) => (
          item.id === student.id
            ? { ...item, completedParts: nextParts }
            : item
        )),
      };

      try {
        await toggleStudentPart({
          studentId: student.id,
          partNumber,
          reciterId: this.reciterAccount.id,
          shouldMarkComplete: !active,
        });
        await this.loadDashboardSnapshot();
      } catch (error) {
        this.reciterAccount = {
          ...this.reciterAccount,
          students: previousStudents,
        };
        this.loadError = error?.response?.data?.message || 'تعذر حفظ الجزء المقروء.';
      } finally {
        this.savingKey = '';
      }
    },
  },
};
</script>

<style scoped src="../styles/views/reciter.css"></style>

