import {
  AppButton,
  AppErrorState,
  AppSelect,
  AppTextField,
} from '../../components/ui';
import { normalizeFixedFieldLabels } from '../registration/registrationFieldLabels.mjs';
import { fetchPublicDepartments, fetchPublicRegistrationStatus, submitPublicRegistrationRequest } from '../../services/registrationApi';

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
      departments: [],
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
  computed: {
    departmentOptions() { return this.departments.map(department => ({ label: department.name, value: department.id })); },
  },
  methods: {
    async initializeRegistration() {
      try {
        const payload = await fetchPublicDepartments();
        this.departments = payload?.departments || payload || [];
        const requested = String(this.$route.query.departmentId || '');
        const requestedDepartment = this.departments.find(item => String(item.id) === requested);
        if (requested && !requestedDepartment) {
          this.departmentId = '';
          this.loadError = 'الإدارة المطلوبة غير متاحة. اختر إدارة أخرى.';
          this.registrationState = REGISTRATION_STATES.ERROR;
          return;
        }
        this.departmentId = requestedDepartment?.id || (this.departments.length === 1 ? this.departments[0].id : '');
        await this.loadStatus();
      } catch (error) {
        this.loadError = error?.response?.data?.message || 'تعذر تحميل الإدارات.';
        this.registrationState = REGISTRATION_STATES.ERROR;
      }
    },
    async loadStatus() {
      const generation = ++this.statusGeneration;
      if (!this.departmentId) { this.registrationState = 'choose'; return; }
      this.registrationState = REGISTRATION_STATES.LOADING;
      this.loadError = '';

      try {
        const payload = await fetchPublicRegistrationStatus(this.departmentId);
        if (generation !== this.statusGeneration) return;
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

      try {
        await submitPublicRegistrationRequest({ ...this.form, departmentId: this.departmentId });
        this.$toast.success('أُرسل الطلب. سيحدد مسؤول الإدارة بيانات الدخول عند القبول.');
        this.registrationState = REGISTRATION_STATES.SUCCESS;
        this.form = {
          name: '',
          gender: '',
          phone: '',
          answers: this.createEmptyAnswers(),
        };
      } catch (error) {
        const message = error?.response?.data?.errors?.phone?.[0]
          || error?.response?.data?.errors?.age?.[0]
          || error?.response?.data?.errors?.answers?.[0]
          || error?.response?.data?.errors?.registration?.[0]
          || error?.response?.data?.message
          || 'تعذر إرسال طلب التسجيل';
        this.$toast.error(message);
      } finally {
        this.submitting = false;
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
