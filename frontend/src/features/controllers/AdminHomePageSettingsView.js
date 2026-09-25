import { mapActions, mapState } from 'vuex';
import HomeAboutSettings from '../../components/home/HomeAboutSettings.vue';
import HomeFooterSettings from '../../components/home/HomeFooterSettings.vue';
import HomeIndicatorsSettings from '../../components/home/HomeIndicatorsSettings.vue';
import HomeIntroSettings from '../../components/home/HomeIntroSettings.vue';
import HomeProgramStructureSettings from '../../components/home/HomeProgramStructureSettings.vue';
import HomeRequirementsSettings from '../../components/home/HomeRequirementsSettings.vue';
import HomeScheduleSettings from '../../components/home/HomeScheduleSettings.vue';
import HomeSettingsDeleteDialog from '../../components/home/HomeSettingsDeleteDialog.vue';
import { AppButton } from '../../components/ui';
import { updatePractitionerPageContent } from '../../services/api';
import { clonePractitionerPageContent } from '../../utils/practitionerPageContent';

export default {
  name: 'AdminHomePageSettingsView',
  components: {
    AppButton,
    HomeAboutSettings,
    HomeFooterSettings,
    HomeIndicatorsSettings,
    HomeIntroSettings,
    HomeProgramStructureSettings,
    HomeRequirementsSettings,
    HomeScheduleSettings,
    HomeSettingsDeleteDialog,
  },
  props: { embedded: { type: Boolean, default: false } },
  data() {
    return {
      form: clonePractitionerPageContent(),
      saving: false,
      errorMessage: '',
      successMessage: '',
      deleteDialogOpen: false,
      pendingDeleteItem: null,
    };
  },
  computed: { ...mapState(['dashboardSnapshot']) },
  watch: {
    'dashboardSnapshot.practitionerPageContent': {
      immediate: true,
      handler(value) { this.form = clonePractitionerPageContent(value || null); },
    },
  },
  methods: {
    ...mapActions(['loadDashboardSnapshot']),
    deleteItem(key, index) {
      const items = this.form?.[key];
      if (!Array.isArray(items) || index < 0 || index >= items.length) return;
      this.pendingDeleteItem = { key, index };
      this.deleteDialogOpen = true;
    },
    handleDeleteDialogInput(open) {
      if (open) this.deleteDialogOpen = true;
      else this.closeDeleteDialog();
    },
    closeDeleteDialog() {
      if (this.saving) return;
      this.deleteDialogOpen = false;
      this.pendingDeleteItem = null;
    },
    async confirmDeleteItem() {
      const target = this.pendingDeleteItem;
      if (!target) return;
      const items = this.form?.[target.key];
      if (!Array.isArray(items) || target.index < 0 || target.index >= items.length) {
        this.closeDeleteDialog();
        return;
      }
      items.splice(target.index, 1);
      await this.saveContent();
      this.deleteDialogOpen = false;
      this.pendingDeleteItem = null;
    },
    async saveContent() {
      this.saving = true;
      this.errorMessage = '';
      this.successMessage = '';
      try {
        await updatePractitionerPageContent(this.form);
        await this.loadDashboardSnapshot();
        this.successMessage = 'تم حفظ نصوص صفحة رخصة ممارس.';
      } catch (error) {
        this.errorMessage = error?.response?.data?.message || 'تعذر حفظ نصوص صفحة رخصة ممارس.';
      } finally {
        this.saving = false;
      }
    },
  },
};
