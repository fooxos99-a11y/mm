<template>
  <div class="landing-page practitioner-page">
    <PractitionerHeader
      :scrolled="scrolled"
      :page-content="pageContent"
      :page-nav-items="pageNavItems"
      :is-authenticated="isAuthenticated"
      :account-menu-open="accountMenuOpen"
      :profile-name="profileName"
      :account-menu-items="accountMenuItems"
      :license-programs="licensePrograms"
      @account-click="handleAccountClick"
      @open-profile="openProfileDialog"
      @account-menu-action="handleAccountMenuAction"
      @open-program="openProgram"
    />

    <PractitionerHero :page-content="pageContent" />

    <PractitionerContent
      :page-content="pageContent"
      :page-goals="pageGoals"
      :page-domains="pageDomains"
      :page-includes-items="pageIncludesItems"
      :page-requirements="pageRequirements"
      :page-recitation="pageRecitation"
      :page-duration-quick-info="pageDurationQuickInfo"
      :page-start-dates="pageStartDates"
      :program-indicators="programIndicators"
      :animated-value="animatedProgramStatValue"
    />

    <PractitionerFooter
      :page-content="pageContent"
      :page-nav-items="pageNavItems"
      :current-year="currentYear"
    />

    <PractitionerAccountDialogs
      :login-dialog-open="loginDialogOpen"
      :profile-dialog-open="profileDialogOpen"
      :page-content="pageContent"
      :auth-error="authError"
      :auth-loading="authLoading"
      :login-form="loginForm"
      :current-user="currentUser"
      :profile-name="profileName"
      :account-role-label="accountRoleLabel"
      @update:login-dialog-open="loginDialogOpen = $event"
      @update:profile-dialog-open="profileDialogOpen = $event"
      @update:login-form="loginForm = $event"
      @close-login="closeLoginDialog"
      @close-profile="closeProfileDialog"
      @submit-login="submitLoginDialog"
    />
  </div>
</template>

<script src="../features/practitioner/practitionerView.js"></script>

<style src="../styles/views/practitioner.css"></style>
<style src="../styles/views/practitioner-hero.css"></style>
<style src="../styles/views/practitioner-domains.css"></style>
<style src="../styles/views/practitioner-footer.css"></style>
<style src="../styles/views/practitioner-responsive.css"></style>
