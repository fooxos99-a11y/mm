export const finalExamIndicatorMethods = {
    buildIndicatorRingStyle(percent) {
      const safePercent = this.animatedIndicatorPercent(percent);

      return {
        background: `conic-gradient(#156c82 0 ${safePercent}%, #e9f2f5 ${safePercent}% 100%)`,
      };
    },
    syncBranchState(branchCode = '') {
      const requestedBranchCode = branchCode || this.selectedBranch;
      const activeBranchCode = this.branchOptions.some((branch) => branch.value === requestedBranchCode)
        ? requestedBranchCode
        : this.defaultBranchCode();

      if (this.selectedBranch !== activeBranchCode) {
        this.selectedBranch = activeBranchCode;
      }

      const setting = this.settings[activeBranchCode] || { isEnabled: false, closesAt: null };
      this.isEnabled = this.isBranchActive(activeBranchCode);

      if (setting.closesAt) {
        const remainingMinutes = this.minutesUntil(setting.closesAt);

        if (remainingMinutes > 0) {
          this.openDurationMinutes = remainingMinutes;
        }
      }

      this.emitTopbarState(setting, activeBranchCode);
    },
    defaultBranchCode() {
      return this.branchOptions[this.branchOptions.length - 1]?.value || 'male';
    },
    emitTopbarState(setting, branchCode) {
      this.$emit('final-exam-topbar-state', {
        branchCode,
        branchLabel: this.branchLabel(branchCode),
        isEnabled: this.isBranchActive(branchCode),
        closesAt: setting?.closesAt || null,
        timers: this.activeBranches
          .map((activeBranchCode) => {
            const activeSetting = this.settings[activeBranchCode] || { closesAt: null };

            if (!this.isBranchActive(activeBranchCode) || !activeSetting.closesAt) {
              return null;
            }

            return {
              branchCode: activeBranchCode,
              branchLabel: this.branchLabel(activeBranchCode),
              closesAt: activeSetting.closesAt,
            };
          })
          .filter(Boolean),
      });
    },
};
