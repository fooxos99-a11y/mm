import { mapState } from 'vuex';
import {
  AppButton,
  AppRawButton,
} from '../../components/ui';
import RegistrationFieldsDialog from '../../components/RegistrationFieldsDialog.vue';
import RegistrationAcceptanceDialog from '../../components/registration/RegistrationAcceptanceDialog.vue';
import {
  acceptRegistrationRequest,
  fetchRegistrationDashboardData,
  markRegistrationRequestAccepted,
  rejectRegistrationRequest,
  updateRegistrationFields,
  updateRegistrationSettings,
} from '../../services/registrationApi';
import { normalizeFixedFieldLabels } from '../registration/registrationFieldLabels.mjs';

export default {
  name: 'AdminRegistrationView',
  components: {
    AppButton,
    AppRawButton,
    RegistrationFieldsDialog,
    RegistrationAcceptanceDialog,
  },
  props: {
    embedded: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      loading: false,
      settingsSubmitting: false,
      busyRequestId: '',
      busyAction: '',
      selectedRequestId: '',
      fieldsDialogOpen: false,
      acceptanceDialogOpen: false,
      acceptanceRequest: null,
      fieldsSubmitting: false,
      isOpen: false,
      registrationUrl: '',
      registrationFields: [],
      fixedLabels: normalizeFixedFieldLabels(),
      requests: [],
    };
  },
  computed: {
    ...mapState(['dashboardSnapshot']),
    branchesMap() {
      return Object.fromEntries((this.dashboardSnapshot?.branches || []).map((branch) => [branch.id, branch.label]));
    },
    pendingRequests() {
      return this.requests.filter((request) => request.status === 'pending');
    },
    branchOptions() {
      const branches = this.dashboardSnapshot?.branches || [];
      if (branches.length) {
        return branches.map((branch) => ({ label: branch.label, value: branch.id }));
      }
      return [
        { label: 'معلمين', value: 'male' },
        { label: 'معلمات', value: 'female' },
      ];
    },
  },
  created() {
    this.loadRegistrationData();
  },
  methods: {
    emitTopbarState(extra = {}) {
      this.$emit('registration-topbar-state', {
        isOpen: this.isOpen,
        loading: this.settingsSubmitting,
        ...extra,
      });
    },
    selectRequestCard(requestId) {
      this.selectedRequestId = this.selectedRequestId === requestId ? '' : requestId;
    },
    genderLabel(gender) {
      if (gender === 'female') {
        return 'أنثى';
      }

      if (gender === 'male') {
        return 'ذكر';
      }

      return 'غير محدد';
    },
    async loadRegistrationData() {
      this.loading = true;

      try {
        const payload = await fetchRegistrationDashboardData();
        this.isOpen = Boolean(payload?.isOpen);
        this.registrationUrl = typeof window !== 'undefined'
          ? `${window.location.origin}/registration`
          : (payload?.registrationUrl || '');
        this.registrationFields = Array.isArray(payload?.fields) ? payload.fields : [];
        this.fixedLabels = normalizeFixedFieldLabels(payload?.fixedLabels);
        this.requests = Array.isArray(payload?.requests) ? payload.requests : [];
        this.emitTopbarState();
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر تحميل بيانات التسجيل');
      } finally {
        this.loading = false;
      }
    },
    async toggleRegistration() {
      this.settingsSubmitting = true;
      this.emitTopbarState({ loading: true });

      try {
        await updateRegistrationSettings(!this.isOpen);
        this.isOpen = !this.isOpen;
        this.emitTopbarState();
        this.$toast.success(this.isOpen ? 'تم فتح التسجيل' : 'تم إغلاق التسجيل');
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر تحديث حالة التسجيل');
      } finally {
        this.settingsSubmitting = false;
        this.emitTopbarState();
      }
    },
    openFieldsDialog() {
      this.fieldsDialogOpen = true;
    },
    async saveRegistrationFields(fields, fixedLabels = this.fixedLabels) {
      if (fields.some((field) => field.type === 'select' && field.options.length === 0)) {
        this.$toast.error('أضف خيارًا واحدًا على الأقل لكل قائمة منسدلة');
        return;
      }

      this.fieldsSubmitting = true;

      try {
        const payload = await updateRegistrationFields(fields, fixedLabels);
        this.registrationFields = Array.isArray(payload?.fields) ? payload.fields : fields;
        this.fixedLabels = normalizeFixedFieldLabels(payload?.fixedLabels || fixedLabels);
        this.fieldsDialogOpen = false;
        this.$toast.success('تم حفظ بيانات التسجيل');
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر حفظ بيانات التسجيل');
      } finally {
        this.fieldsSubmitting = false;
      }
    },
    requestAnswerList(request) {
      return Object.values(request?.answers || {}).filter((answer) => answer?.label && answer.showInRequests !== false);
    },
    openAcceptanceDialog(request) {
      this.acceptanceRequest = request;
      this.acceptanceDialogOpen = true;
    },
    async acceptRequest(payload) {
      const requestId = this.acceptanceRequest?.id;
      if (!requestId) return;

      this.busyRequestId = requestId;
      this.busyAction = 'accept';

      try {
        const updatedRequest = await acceptRegistrationRequest(requestId, payload);
        this.requests = this.requests.map((item) => (item.id === requestId ? updatedRequest : item));
        this.acceptanceDialogOpen = false;
        this.acceptanceRequest = null;
        this.$toast.success('تم قبول الطلب وإنشاء الحساب');
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر قبول الطلب');
      } finally {
        this.busyRequestId = '';
        this.busyAction = '';
      }
    },
    async rejectRequest(requestId) {
      this.busyRequestId = requestId;
      this.busyAction = 'reject';

      try {
        const updatedRequest = await rejectRegistrationRequest(requestId);
        this.requests = this.requests.map((request) => (request.id === requestId ? updatedRequest : request));
        this.$toast.success('تم رفض الطلب');
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر رفض الطلب');
      } finally {
        this.busyRequestId = '';
        this.busyAction = '';
      }
    },
    async markRequestAccepted(requestId) {
      this.busyRequestId = requestId;
      this.busyAction = 'mark-accepted';

      try {
        const updatedRequest = await markRegistrationRequestAccepted(requestId);
        this.requests = this.requests.map((request) => (request.id === requestId ? updatedRequest : request));
        if (this.selectedRequestId === requestId) {
          this.selectedRequestId = '';
        }
        this.$toast.success('تم اعتماد الطلب وإخفاؤه من المعلّقة');
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر اعتماد الطلب');
      } finally {
        this.busyRequestId = '';
        this.busyAction = '';
      }
    },
    async copyRegistrationLink() {
      if (!this.registrationUrl) {
        this.$toast.error('رابط التسجيل غير متاح');
        return;
      }

      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(this.registrationUrl);
          this.$toast.success('تم نسخ رابط التسجيل');
          return;
        }

        if (typeof document !== 'undefined') {
          const input = document.createElement('textarea');
          input.value = this.registrationUrl;
          input.setAttribute('readonly', 'readonly');
          input.style.position = 'fixed';
          input.style.opacity = '0';
          document.body.appendChild(input);
          input.select();
          input.setSelectionRange(0, input.value.length);

          const copied = document.execCommand('copy');
          input.remove();

          if (copied) {
            this.$toast.success('تم نسخ رابط التسجيل');
            return;
          }
        }
      } catch {
        // Fall through to the shared error toast below.
      }

      this.$toast.error('تعذر نسخ الرابط');
    },
    branchLabel(branchId) {
      return this.branchesMap[branchId] || branchId || 'غير محدد';
    },
    statusLabel(status) {
      if (status === 'accepted') {
        return 'مقبول';
      }

      if (status === 'rejected') {
        return 'مرفوض';
      }

      return 'معلّق';
    },
    formatDate(value) {
      if (!value) {
        return '--';
      }

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return '--';
      }

      return date.toLocaleString('ar-SA');
    },
  },
};
