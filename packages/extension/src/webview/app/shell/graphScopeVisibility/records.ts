export function visibilityRecordsMatch(
  left: Record<string, boolean>,
  right: Record<string, boolean>,
): boolean {
  const leftEntries = Object.entries(left);
  if (leftEntries.length !== Object.keys(right).length) return false;
  return leftEntries.every(([scopeId, enabled]) => right[scopeId] === enabled);
}

export function stabilizeVisibilityRecord(
  current: Record<string, boolean>,
  incoming: Record<string, boolean>,
): Record<string, boolean> {
  return visibilityRecordsMatch(current, incoming) ? current : incoming;
}
