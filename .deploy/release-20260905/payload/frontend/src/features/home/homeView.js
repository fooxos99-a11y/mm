import { defineAsyncComponent } from 'vue';
import { mapActions, mapGetters, mapState } from 'vuex';
import LicenseProgramsMenu from '../../components/public/LicenseProgramsMenu.vue';
import AppButton from '../../components/ui/AppButton.vue';
import computed from './homeComputed';
import methods from './homeMethods';
import watchers from './homeWatchers';

const HomeProgramsSection = defineAsyncComponent(() => import(
  /* webpackChunkName: "public-home-programs" */
  '../../components/home/HomeProgramsSection.vue'
));
const HomeSupportingSections = defineAsyncComponent(() => import(
  /* webpackChunkName: "public-home-supporting" */
  '../../components/home/HomeSupportingSections.vue'
));
const PublicAccountDialogs = defineAsyncComponent(() => import(
  /* webpackChunkName: "public-account-dialogs" */
  '../../components/public/PublicAccountDialogs.vue'
));

export default {
  name: 'HomeView',
  components: {
    AppButton,
    HomeProgramsSection,
    HomeSupportingSections,
    LicenseProgramsMenu,
    PublicAccountDialogs,
  },
  data() {
    return {
      scrolled: false,
      accountMenuOpen: false,
      profileDialogOpen: false,
      loginDialogOpen: false,
      loginRedirectPath: '',
      loginForm: { loginCode: '', password: '' },
      publicSnapshot: null,
      publicStats: null,
      statsAnimationProgress: 0,
      statsAnimationFrameId: null,
      statsAnimationStarted: false,
      animatedAchievements: {
        maleTrainees: 0, femaleTrainees: 0, satisfactionRate: 0, licenseCount: 0,
      },
      achievementAnimationStarted: false,
      achievementSectionVisible: false,
      achievementAnimationTimer: null,
      programsRevealed: false,
      publicDataLoaded: false,
      programsMounted: false,
      supportingContentMounted: false,
      deferredContentFrameIds: [],
      deferredProgramsObserver: null,
      deferredContentObserver: null,
      deferredContentTimerId: null,
      publicDataTimerId: null,
    };
  },
  computed: {
    ...mapState(['authError', 'authLoading', 'currentUser']),
    ...mapGetters(['isAuthenticated']),
    ...computed,
  },
  watch: watchers,
  mounted() {
    this.handleScroll();
    this.scheduleDeferredContent();
    this.schedulePublicDataLoad();
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    window.addEventListener('click', this.handleWindowClick);
  },
  beforeUnmount() {
    if (this.statsAnimationFrameId) window.cancelAnimationFrame(this.statsAnimationFrameId);
    if (this.achievementAnimationTimer) window.clearTimeout(this.achievementAnimationTimer);
    this.deferredContentFrameIds.forEach((id) => window.cancelAnimationFrame(id));
    this.deferredProgramsObserver?.disconnect();
    this.deferredContentObserver?.disconnect();
    if (this.deferredContentTimerId) window.clearTimeout(this.deferredContentTimerId);
    if (this.publicDataTimerId) window.clearTimeout(this.publicDataTimerId);
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('click', this.handleWindowClick);
  },
  methods: { ...mapActions(['login', 'logout']), ...methods },
};
