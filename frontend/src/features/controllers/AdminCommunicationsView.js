import { mapActions, mapState } from 'vuex';
import NotificationPrepPanel from '../../components/communications/NotificationPrepPanel.vue';

const emptyNotification = (currentUser) => ({
  title: '',
  message: '',
  targetBranchId: null,
  targetLoginIds: [],
  createdByName: currentUser?.name || 'مشرف النظام',
  createdByRole: currentUser?.role || 'admin',
});

export default {
  name: 'AdminCommunicationsView',
  components: { NotificationPrepPanel },
  props: {
    embedded: { type: Boolean, default: false },
  },
  data() {
    return {
      notificationForm: emptyNotification(),
      notificationSubmitting: false,
      branchOptions: [
        { label: 'كل الفروع', value: null },
        { label: 'معلمين', value: 'male' },
        { label: 'معلمات', value: 'female' },
      ],
    };
  },
  computed: {
    ...mapState(['dashboardSnapshot', 'currentUser']),
    notificationTargetStudents() {
      const targetBranch = this.notificationForm.targetBranchId;
      const students = this.dashboardSnapshot?.students || [];

      return students
        .filter((student) => !targetBranch || student.branchId === targetBranch)
        .sort((left, right) => (left.name || '').localeCompare(right.name || '', 'ar'))
        .map((student) => ({ label: student.name, value: student.loginId }));
    },
    allNotificationTargetStudentsSelected() {
      return this.notificationTargetStudents.length > 0
        && this.notificationTargetStudents.every((student) => this.notificationForm.targetLoginIds.includes(student.value));
    },
    selectedNotificationTargetStudentsCount() {
      return this.notificationTargetStudents.filter((student) => this.notificationForm.targetLoginIds.includes(student.value)).length;
    },
  },
  created() {
    this.notificationForm = emptyNotification(this.currentUser);
    if (!this.dashboardSnapshot) this.loadDashboardSnapshot();
  },
  methods: {
    ...mapActions(['loadDashboardSnapshot', 'addNotification']),
    toggleNotificationTarget(loginId) {
      if (this.notificationForm.targetLoginIds.includes(loginId)) {
        this.notificationForm.targetLoginIds = this.notificationForm.targetLoginIds.filter((currentId) => currentId !== loginId);
        return;
      }

      this.notificationForm.targetLoginIds = [...this.notificationForm.targetLoginIds, loginId];
    },
    toggleAllNotificationTargets() {
      this.notificationForm.targetLoginIds = this.allNotificationTargetStudentsSelected
        ? []
        : this.notificationTargetStudents.map((student) => student.value);
    },
    async submitNotification() {
      if (!this.notificationForm.message) {
        this.$toast.error('أدخل نص الإشعار أولًا');
        return;
      }

      this.notificationForm.title = this.notificationForm.title
        || this.notificationForm.message.slice(0, 80)
        || 'إشعار إداري';
      this.notificationSubmitting = true;

      try {
        await this.addNotification({ ...this.notificationForm });
        this.notificationForm = emptyNotification(this.currentUser);
        this.$toast.success('تم إرسال الإشعار');
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر إرسال الإشعار');
      } finally {
        this.notificationSubmitting = false;
      }
    },
  },
};
