import type { IGroup } from '../../../../../shared/settings/groups';

export function reorderSettingsGroups(
  groups: IGroup[],
  sourceIndex: number,
  targetIndex: number,
): IGroup[] {
  if (
    sourceIndex < 0
    || targetIndex < 0
    || sourceIndex >= groups.length
    || targetIndex >= groups.length
    || sourceIndex === targetIndex
  ) {
    return groups;
  }

  const reordered = [...groups];
  const [movedGroup] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, movedGroup);
  return reordered;
}
