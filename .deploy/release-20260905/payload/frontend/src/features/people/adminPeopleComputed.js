import accessComputed from './adminPeopleAccessComputed';
import formComputed from './adminPeopleFormComputed';
import recordsComputed from './adminPeopleRecordsComputed';

export default {
  ...accessComputed,
  ...recordsComputed,
  visiblePeopleCards() { return this.directoryRows; },
  ...formComputed,
};
