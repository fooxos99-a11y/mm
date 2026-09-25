export default {
  formatCountdownLabel(durationMs) {
    const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  },
  buildTopbarCountdownItems(timers, defaultText, fallbackBranchLabel = '', fallbackClosesAt = null) {
    const normalizedTimers = Array.isArray(timers) && timers.length
      ? timers
      : (fallbackClosesAt ? [{ branchCode: '', branchLabel: fallbackBranchLabel, closesAt: fallbackClosesAt }] : []);

    return normalizedTimers.reduce((items, timer) => {
      const parsed = new Date(timer?.closesAt || '');
      if (Number.isNaN(parsed.getTime())) return items;
      const durationMs = Math.max(0, parsed.getTime() - this.currentTimestamp);
      if (durationMs <= 0) return items;
      items.push({
        branchCode: timer?.branchCode || '',
        branchLabel: timer?.branchLabel || '',
        text: timer?.branchLabel ? `${defaultText} ${timer.branchLabel}` : defaultText,
        label: this.formatCountdownLabel(durationMs),
        closesAt: timer?.closesAt || null,
      });

      return items;
    }, []);
  },
  isMenuItemActive(item) {
    if (item.id === 'settings') return this.settingsMenuOpen || this.activeMenu === 'settings';
    return this.activeMenu === item.id;
  },
  async openSettingsItem(itemId) {
    if (!this.settingsItems.some((item) => item.id === itemId)) return;
    this.selectedSettingsItemId = itemId;
    this.settingsMenuOpen = true;
    await this.openPanel('settings');
  },
  handleAssessmentTopbarState(payload) {
    this.assessmentTopbarState = {
      visible: !!payload?.visible,
      label: payload?.label || '',
      type: payload?.type || '',
      isEnabled: !!payload?.isEnabled,
      closesAt: payload?.closesAt || null,
      timers: Array.isArray(payload?.timers) ? payload.timers : [],
    };
  },
  handleFinalExamTopbarState(payload) {
    this.finalExamTopbarState = {
      branchCode: payload?.branchCode || 'male',
      branchLabel: payload?.branchLabel || 'معلمين',
      isEnabled: !!payload?.isEnabled,
      closesAt: payload?.closesAt || null,
      timers: Array.isArray(payload?.timers) ? payload.timers : [],
    };
  },
  handleRegistrationTopbarState(payload) {
    this.registrationTopbarState = { isOpen: !!payload?.isOpen, loading: !!payload?.loading };
  },
  handlePermissionsTopbarState(payload) {
    this.permissionsTopbarState = {
      isAdmin: !!payload?.isAdmin,
      activeSection: payload?.activeSection || 'permissions',
    };
  },
};
