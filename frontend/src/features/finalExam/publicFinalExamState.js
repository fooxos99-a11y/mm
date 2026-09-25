export default function createPublicFinalExamState() {
  return {
    publicSnapshot: null,
    publicLoading: false,
    publicError: '',
    studentLoginId: '',
    studentResolved: false,
    answers: {},
    files: {},
    pageError: '',
    submitting: false,
    previewDialogOpen: false,
    previewAttachment: null,
    resetKey: 0,
    currentTimestamp: Date.now(),
    clockIntervalId: null,
    publicLoadingGuardTimer: null,
    publicAutoRefreshTimer: null,
    publicRefreshInFlight: false,
  };
}
