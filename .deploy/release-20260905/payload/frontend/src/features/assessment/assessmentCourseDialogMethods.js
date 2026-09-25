export default {
  async moveManagedCourse({ course, offset }) {
    if (!course || !Number.isInteger(offset) || offset === 0) return;

    const sameTypeCourses = [...(this.dashboardSnapshot?.courses || [])]
      .filter((item) => item.entityType === course.entityType)
      .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
    const currentTypeIndex = sameTypeCourses.findIndex((item) => item.id === course.id);
    const target = sameTypeCourses[currentTypeIndex + offset];

    if (!target) return;

    const targetIndex = currentTypeIndex + offset;
    [sameTypeCourses[currentTypeIndex], sameTypeCourses[targetIndex]] = [sameTypeCourses[targetIndex], sameTypeCourses[currentTypeIndex]];

    try {
      await this.reorderCourses(sameTypeCourses.map((item) => item.id));
      this.$toast.success('تم تحديث الترتيب');
    } catch (error) {
      this.$toast.error(error?.response?.data?.message || 'تعذر تحديث الترتيب');
    }
  },
  openCourseEditDialog(course) {
    this.courseEditId = course.id;
    this.courseEditTitle = course.title || '';
    this.courseEditSubmitting = false;
    this.courseEditDialogOpen = true;
  },
  requestManagedCourseDelete(course) {
    this.courseDeleteId = course.id;
    this.courseDeleteTitle = course.title || '';
    this.assessmentDeleteSubmitting = false;
    this.courseDeleteDialogOpen = true;
  },
  closeCourseEditDialog() {
    this.courseEditDialogOpen = false;
    this.courseEditId = '';
    this.courseEditTitle = '';
    this.courseEditSubmitting = false;
  },
  closeCourseDeleteDialog() {
    this.courseDeleteDialogOpen = false;
    this.courseDeleteId = '';
    this.courseDeleteTitle = '';
    this.assessmentDeleteSubmitting = false;
  },
  async saveCourseEdit() {
    if (!this.courseEditId || !this.courseEditTitle.trim()) {
      return;
    }

    this.courseEditSubmitting = true;

    try {
      await this.updateCourse({
        courseId: this.courseEditId,
        updates: {
          title: this.courseEditTitle.trim(),
        },
      });
      this.$toast.success(this.isTasksPage ? 'تم تعديل اسم المهمة' : 'تم تعديل اسم الدورة');
      this.closeCourseEditDialog();
    } catch (error) {
      this.$toast.error(error?.response?.data?.message || (this.isTasksPage ? 'تعذر تعديل اسم المهمة' : 'تعذر تعديل اسم الدورة'));
    } finally {
      this.courseEditSubmitting = false;
    }
  },
  async confirmManagedCourseDelete() {
    if (!this.courseDeleteId) {
      return;
    }

    const courseId = this.courseDeleteId;

    this.deletingCourseId = courseId;
    this.assessmentDeleteSubmitting = true;

    try {
      await this.deleteCourse(courseId);

      if (this.selectedCourseId === courseId) {
        this.closeQuestionDetails();
      }

      if (this.courseEditId === courseId) {
        this.closeCourseEditDialog();
      }

      this.$toast.success(this.isTasksPage ? 'تم حذف المهمة' : 'تم حذف الدورة');
      this.closeCourseDeleteDialog();
    } catch (error) {
      this.$toast.error(error?.response?.data?.message || (this.isTasksPage ? 'تعذر حذف المهمة' : 'تعذر حذف الدورة'));
    } finally {
      this.deletingCourseId = '';
      this.assessmentDeleteSubmitting = false;
    }
  },
};
