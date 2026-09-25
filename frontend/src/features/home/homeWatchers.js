

export default {
    '$route.query.login': {
      immediate: true,
      handler() {
        this.syncLoginDialogFromRoute();
      },
    },
};
