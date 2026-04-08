import type { IGroup } from '../../shared/settings/groups';

export function areGroupListsEqual(left: IGroup[], right: IGroup[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((group, index) => {
    const candidate = right[index];

    const leftKeys = Object.keys(group) as Array<keyof IGroup>;
    const rightKeys = Object.keys(candidate) as Array<keyof IGroup>;
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    return leftKeys.every((key) => group[key] === candidate[key]);
  });
}

export function replaceUserGroups(
  incomingGroups: IGroup[],
  userGroups: IGroup[],
): IGroup[] {
  return [
    ...userGroups,
    ...incomingGroups.filter((group) => group.isPluginDefault),
  ];
}
