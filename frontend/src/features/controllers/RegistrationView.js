import {
  AppButton,
  AppErrorState,
  AppSelect,
  AppTextField,
} from '../../components/ui';
import { normalizeFixedFieldLabels } from '../registration/registrationFieldLabels.mjs';
import { fetchPublicRegistrationStatus, submitPublicRegistrationRequest } from '../../services/registrationApi';

const REGISTRATION_STATES = Object.freeze({
  LOADING: 'loading',
  OPEN: 'open',
  CLOSED: 'closed',
  ERROR: 'error',
  SUCCESS: 'success',
});

export default {
  name: 'RegistrationView',
  components: {
    AppButton,
    AppErrorState,
    AppSelect,
    AppTextField,
  },
  data() {
    return {
      submitting: false,
      registrationState: REGISTRATION_STATES.LOADING,
      loadError: '',
      departmentId: '',
      statusGeneration: 0,
      registrationFields: [],
      fixedLabels: normalizeFixedFieldLabels(),
      genderOptions: [
        { label: 'ذكر', value: 'male' },
        { label: 'أنثى', value: 'female' },
      ],
      form: {
        name: '',
        gender: '',
        phone: '',
        answers: {},
      },
    };
  },
  created() {
    this.initializeRegistration();
  },
  watch: {
    '$route.query.departmentId': 'initializeRegistration',
  },
  methods: {
    async initializeRegistration() {
      const requested = this.$route.query.departmentId;
      this.form = { name: '', gender: '', phone: '', answers: {} };
      this.registrationFields = [];
      this.submitting = false;
      if (requested !== undefined && (typeof requested !== 'string' || !requested.trim())) {
        this.statusGeneration += 1;
        this.loadError = 'رابط التسجيل غير صالح.';
        this.registrationState = REGISTRATION_STATES.ERROR;
        return;
      }
      this.departmentId = requested || '';
      await this.loadStatus();
    },
    async loadStatus() {
      const generation = ++this.statusGeneration;
      this.registrationState = REGISTRATION_STATES.LOADING;
      this.loadError = '';

      try {
        const payload = await fetchPublicRegistrationStatus(this.departmentId);
        if (generation !== this.statusGeneration) return;
        this.departmentId = payload?.departmentId || this.departmentId;
        this.registrationState = payload?.isOpen
          ? REGISTRATION_STATES.OPEN
          : REGISTRATION_STATES.CLOSED;
        this.registrationFields = Array.isArray(payload?.fields) ? payload.fields : [];
        this.fixedLabels = normalizeFixedFieldLabels(payload?.fixedLabels);
        this.resetAnswers();
      } catch (error) {
        if (generation !== this.statusGeneration) return;
        this.loadError = error?.response?.data?.message
          || 'تعذر تحميل حالة التسجيل';
        this.registrationState = REGISTRATION_STATES.ERROR;
        this.$toast.error(error?.response?.data?.message || 'تعذر تحميل حالة التسجيل');
      }
    },
    async submitRegistration() {
      if (this.form.name.trim().length < 6 || !this.form.gender || !/^\d{10}$/.test(this.form.phone) || this.hasMissingRequiredAnswers()) {
        this.$toast.error('أكمل البيانات المطلوبة بشكل صحيح');
        return;
      }

      this.submitting = true;
      const generation = this.statusGeneration;

      try {
        await submitPublicRegistrationRequest({ ...this.form, departmentId: this.departmentId });
        if (generation !== this.statusGeneration) return;
        this.$toast.success('أُرسل الطلب. سيحدد مسؤول الإدارة بيانات الدخول عند القبول.');
        this.registrationState = REGISTRATION_STATES.SUCCESS;
        this.form = {
          name: '',
          gender: '',
          phone: '',
          answers: this.createEmptyAnswers(),
        };
      } catch (error) {
        if (generation !== this.statusGeneration) return;
        const message = error?.response?.data?.errors?.phone?.[0]
          || error?.response?.data?.errors?.age?.[0]
          || error?.response?.data?.errors?.answers?.[0]
          || error?.response?.data?.errors?.registration?.[0]
          || error?.response?.data?.message
          || 'تعذر إرسال طلب التسجيل';
        this.$toast.error(message);
      } finally {
        if (generation === this.statusGeneration) this.submitting = false;
      }
    },
    createEmptyAnswers() {
      return Object.fromEntries(this.registrationFields.map((field) => [field.id, '']));
    },
    fieldInputId(fieldId) {
      return `registration-field-${encodeURIComponent(String(fieldId))}`;
    },
    resetAnswers() {
      this.form.answers = this.createEmptyAnswers();
    },
    hasMissingRequiredAnswers() {
      return this.registrationFields.some((field) => field.required && !String(this.form.answers[field.id] || '').trim());
    },
    digitsOnly(value, maxLength = null) {
      const digits = String(value || '').replace(/\D/g, '');
      return maxLength ? digits.slice(0, maxLength) : digits;
    },
    setNumericAnswer(fieldId, value) {
      this.form.answers[fieldId] = this.digitsOnly(value);
    },
  },
};
