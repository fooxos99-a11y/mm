import test from 'node:test';
import assert from 'node:assert/strict';
import methods from '../src/features/people/peopleManagementMethods.js';
import computed from '../src/features/people/adminPeopleFormComputed.js';
import { createEmptyStudentForm, createEmptyReciterForm } from '../src/features/people/peopleModel.mjs';

for (const entity of ['student', 'reciter']) {
  for (const editing of [false, true]) {
    test(`${entity} ${editing ? 'edit' : 'create'} keeps the chosen branch when resetting context`, () => {
      const vm = {
        ...methods,
        dialogEntityType: entity,
        isEditing: editing,
        editingBranchId: '',
        editingTargetId: 'previous-person',
        studentForm: createEmptyStudentForm(),
        reciterForm: { ...createEmptyReciterForm(), studentIds: ['previous-link'] },
      };
      for (const key of ['activeBranchId', 'dialogBranchId']) {
        Object.defineProperty(vm, key, {
          get: computed[key].get.bind(vm),
          set: computed[key].set.bind(vm),
        });
      }
      for (const branch of ['female', 'male', 'female']) {
        vm.dialogBranchId = branch;
        vm.handleDialogContextChange();
        assert.equal(vm.dialogBranchId, branch);
        assert.equal(vm.activeBranchId, branch);
        assert.equal(vm.editingTargetId, '');
        if (entity === 'reciter') assert.deepEqual(vm.reciterForm.studentIds, []);
      }
    });
  }
}
