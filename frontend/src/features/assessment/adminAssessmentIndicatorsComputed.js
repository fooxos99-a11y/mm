export default {
    assessmentBranchOptions() {
      if (this.managedBranchId) {
        return [
          { label: this.branchLabel(this.managedBranchId), value: this.managedBranchId },
        ];
      }

      return [
        { label: 'معلمين', value: 'male' },
        { label: 'معلمات', value: 'female' },
        { label: 'الكل', value: 'all' },
      ];
    },
    assessmentIndicatorsBranchOptions() {
      if (this.managedBranchId) {
        return [
          { label: this.branchLabel(this.managedBranchId), value: this.managedBranchId },
        ];
      }

      return [
        { label: 'الكل', value: 'all' },
        { label: 'معلمين', value: 'male' },
        { label: 'معلمات', value: 'female' },
      ];
    },
    assessmentIndicatorsCourse() {
      return this.isIndicatorsMode ? this.selectedCourse : null;
    },
    assessmentIndicatorStudents() {
      const targetBranchId = this.managedBranchId || this.assessmentIndicatorsBranch;

      if (targetBranchId === 'all') {
        return this.students;
      }

      return this.students.filter((student) => student.branchId === targetBranchId);
    },
    assessmentIndicatorsTotalStudents() {
      return this.assessmentIndicatorStudents.length;
    },
    assessmentPreIndicator() {
      return this.buildAssessmentScoreIndicator('pre');
    },
    assessmentPostIndicator() {
      return this.buildAssessmentScoreIndicator('post');
    },
    assessmentScoreDiff() {
      return this.assessmentPostIndicator.percent - this.assessmentPreIndicator.percent;
    },
    assessmentPreIndicatorValueLabel() {
      return this.formatScoreValue(this.assessmentPreIndicator.averageScore);
    },
    assessmentPostIndicatorValueLabel() {
      return this.formatScoreValue(this.assessmentPostIndicator.averageScore);
    },
    assessmentPreIndicatorMetaLabel() {
      return this.formatIndicatorMetaLabel(this.assessmentPreIndicator);
    },
    assessmentPostIndicatorMetaLabel() {
      return this.formatIndicatorMetaLabel(this.assessmentPostIndicator);
    },
    assessmentScoreDiffLabel() {
      return `${Math.abs(Math.round(this.assessmentScoreDiff))}%`;
    },
    assessmentScoreDiffClass() {
      if (this.assessmentScoreDiff > 0) {
        return 'assessment-score-diff--positive';
      }

      if (this.assessmentScoreDiff < 0) {
        return 'assessment-score-diff--negative';
      }

      return 'assessment-score-diff--neutral';
    },
    preIndicatorStyle() {
      return this.buildIndicatorRingStyle(this.assessmentPreIndicator.percent);
    },
    postIndicatorStyle() {
      return this.buildIndicatorRingStyle(this.assessmentPostIndicator.percent);
    },
    indicatorAnimationSignature() {
      return [
        'assessments',
        this.assessmentIndicatorsCourse?.id || '',
        this.assessmentIndicatorsBranch,
        this.assessmentPreIndicator.percent,
        this.assessmentPostIndicator.percent,
      ].join('|');
    },
};
