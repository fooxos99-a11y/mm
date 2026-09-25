<template>
  <div class="app-dialog app-dialog--compact">
    <AppDialogHeader :title="title" />
    <AppDialogBody><slot /></AppDialogBody>
    <AppDialogFooter><slot name="actions" /></AppDialogFooter>
  </div>
</template>

<script>
import AppDialogBody from './AppDialogBody.vue';
import AppDialogFooter from './AppDialogFooter.vue';
import AppDialogHeader from './AppDialogHeader.vue';

export default {
  name: 'DialogShell',
  components: { AppDialogBody, AppDialogFooter, AppDialogHeader },
  props: { title: { type: String, required: true } },
};
</script>
<style src="../../styles/ui-dialogs.css"></style>
