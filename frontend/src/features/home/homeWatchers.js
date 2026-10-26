

export default {
    isAuthenticated() { this.syncLoginDialogFromRoute(); },
    '$store.state.authChecked'() { this.syncLoginDialogFromRoute(); },
    '$route.query.login': {
      immediate: true,
      handler() {
        this.syncLoginDialogFromRoute();
      },
    },
};
