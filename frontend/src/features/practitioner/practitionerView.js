import { mapActions, mapGetters, mapState } from 'vuex';
import PractitionerAccountDialogs from '../../components/practitioner/PractitionerAccountDialogs.vue';
import PractitionerContent from '../../components/practitioner/PractitionerContent.vue';
import PractitionerFooter from '../../components/practitioner/PractitionerFooter.vue';
import PractitionerHeader from '../../components/practitioner/PractitionerHeader.vue';
import PractitionerHero from '../../components/practitioner/PractitionerHero.vue';
import computed from './practitionerComputed';
import practitionerData from './practitionerData';
import methods from './practitionerMethods';
import watchers from './practitionerWatchers';

export default {
  name: 'PractitionerView',
  components: {
    PractitionerAccountDialogs,
    PractitionerContent,
    PractitionerFooter,
    PractitionerHeader,
    PractitionerHero,
  },
  data: practitionerData,
  computed: {
    ...mapState(['dashboardSnapshot', 'authError', 'authLoading', 'currentUser']),
    ...mapGetters(['isAuthenticated']),
    ...computed,
  },
  watch: watchers,
  created() {
    this.menuClockTimer = window.setInterval(() => { this.currentTimestamp = Date.now(); }, 1000);
    this.loadPublicData();
    this.loadRegistrationStatus();
    this.publicAutoRefreshTimer = window.setInterval(() => this.refreshAvailabilitySilently(), 2000);
    if (this.isAuthenticated) this.loadDashboardSnapshot();
  },
  mounted() {
    this.handleScroll();
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    window.addEventListener('resize', this.handleResize, { passive: true });
    window.addEventListener('click', this.handleWindowClick);
  },
  beforeUnmount() {
    if (this.statsAnimationFrameId) window.cancelAnimationFrame(this.statsAnimationFrameId);
    if (this.menuClockTimer) window.clearInterval(this.menuClockTimer);
    if (this.publicAutoRefreshTimer) window.clearInterval(this.publicAutoRefreshTimer);
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('click', this.handleWindowClick);
  },
  methods: { ...mapActions(['loadDashboardSnapshot', 'login', 'logout']), ...methods },
};
