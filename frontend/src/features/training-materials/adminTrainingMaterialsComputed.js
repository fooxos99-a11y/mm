import {
  ADD_MATERIAL_OPTION_VALUE,
  ALL_MATERIALS_OPTION_VALUE,
} from './trainingMaterialForm';

const resolveDisplayedMaterials = (materials, selectedMaterialId, selectedMaterial) => {
  if (selectedMaterialId === ALL_MATERIALS_OPTION_VALUE) return materials;

  return selectedMaterial ? [selectedMaterial] : [];
};

export default {
  trainingMaterials() {
    return this.dashboardSnapshot?.trainingMaterials || [];
  },
  hasMaterials() {
    return this.trainingMaterials.length > 0;
  },
  materialOptions() {
    return [
      { label: 'كل المواد', value: ALL_MATERIALS_OPTION_VALUE },
      ...this.trainingMaterials.map((material) => ({
        label: material.title,
        value: material.id,
      })),
      { label: 'إضافة مادة', value: ADD_MATERIAL_OPTION_VALUE },
    ];
  },
  materialSelectValue: {
    get() {
      return this.selectedMaterialId || ALL_MATERIALS_OPTION_VALUE;
    },
    set(value) {
      if (value === ADD_MATERIAL_OPTION_VALUE) {
        const previousSelectedId = this.selectedMaterialId;
        this.openCreateDialog();
        this.$nextTick(() => {
          this.selectedMaterialId = previousSelectedId;
          this.materialSelectResetKey += 1;
        });
        return;
      }

      this.selectedMaterialId = value || ALL_MATERIALS_OPTION_VALUE;
    },
  },
  selectedMaterial() {
    if (this.selectedMaterialId === ALL_MATERIALS_OPTION_VALUE) return null;

    return this.trainingMaterials.find((material) => material.id === this.selectedMaterialId) || null;
  },
  displayedMaterials() {
    if (!this.hasMaterials) return [];

    return resolveDisplayedMaterials(this.trainingMaterials, this.selectedMaterialId, this.selectedMaterial);
  },
  branchOptions() {
    return [
      { id: 'all', label: 'كل الفروع' },
      { id: 'supervision', label: 'الإشراف' },
      ...((this.dashboardSnapshot?.branches || []).map((branch) => ({ id: branch.id, label: branch.label }))),
    ];
  },
  dialogTitle() {
    return this.dialogMode === 'edit' ? 'تعديل المادة التدريبية' : 'إضافة مادة تدريبية';
  },
  submitButtonLabel() {
    return this.dialogMode === 'edit' ? 'حفظ التعديلات' : 'إضافة المادة';
  },
};
