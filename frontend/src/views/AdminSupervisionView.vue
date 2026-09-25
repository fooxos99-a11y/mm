<template>
  <DashboardAccountsPanel
    :embedded="embedded"
    active
  />
</template>

<script>
import DashboardAccountsPanel from '../components/dashboard/DashboardAccountsPanel.vue';

export default {
  name: 'AdminSupervisionView',
  components: { DashboardAccountsPanel },
  props: {
    embedded: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
