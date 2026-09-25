import AdminAssessmentView from '../../views/AdminAssessmentView.vue';

export default {
  name: 'AdminTasksView',
  components: { AdminAssessmentView },
  props: {
    embedded: { type: Boolean, default: false },
    clockTimestamp: { type: Number, default: 0 },
  },
  methods: {
    confirmDiscardChanges() {
      return this.$refs.assessmentPanel?.confirmDiscardChanges?.() ?? true;
    },
    handleCurrentAssessmentAvailabilityAction() {
      this.$refs.assessmentPanel?.handleCurrentAssessmentAvailabilityAction?.();
    },
  },
};
