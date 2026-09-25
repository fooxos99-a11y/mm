// Publish a snapshot only after all result pages succeed, so totals never use partial data.
export const loadCompleteSnapshot = async (fetchPage) => {
  const snapshot = await fetchPage(1);
  const keys = ['submissions', 'attendance', 'satisfactionResponses', 'finalExamSubmissions'];
  let page = 1;
  let latest = snapshot;
  while (keys.some((key) => latest.snapshotMeta?.[key]?.nextPage)) {
    latest = await fetchPage(++page);
    for (const key of keys) {
      const rows = new Map((snapshot[key] || []).map((row) => [row.id, row]));
      for (const row of latest[key] || []) rows.set(row.id, row);
      snapshot[key] = [...rows.values()];
    }
  }
  for (const key of keys) {
    if (snapshot.snapshotMeta?.[key]) {
      snapshot.snapshotMeta[key] = {
        ...latest.snapshotMeta[key], returned: (snapshot[key] || []).length, truncated: false, nextPage: null,
      };
    }
  }
  return snapshot;
};
