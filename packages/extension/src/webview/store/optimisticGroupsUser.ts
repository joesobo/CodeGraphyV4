import type { IGroup } from '../../shared/settings/groups';
import type { PendingUserGroupsUpdate } from './optimisticGroups';

const OPTIMISTIC_GROUP_UPDATE_TTL_MS = 2000;

export function createPendingUserGroupsUpdate(
  groups: IGroup[],
  now: number = Date.now(),
): PendingUserGroupsUpdate {
  return {
    groups: groups.map((group) => ({ ...group })),
    expiresAt: now + OPTIMISTIC_GROUP_UPDATE_TTL_MS,
  };
}

function areGroupListsEqual(left: IGroup[], right: IGroup[]): boolean {
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

function replaceUserGroups(
  incomingGroups: IGroup[],
  userGroups: IGroup[],
): IGroup[] {
  return [
    ...userGroups,
    ...incomingGroups.filter((group) => group.isPluginDefault),
  ];
}

export function applyPendingUserGroupsUpdate(
  incomingGroups: IGroup[],
  pendingUserGroups: PendingUserGroupsUpdate | null,
  now: number = Date.now(),
): {
  groups: IGroup[];
  pendingUserGroups: PendingUserGroupsUpdate | null;
} {
  if (!pendingUserGroups || pendingUserGroups.expiresAt <= now) {
    return {
      groups: incomingGroups,
      pendingUserGroups: null,
    };
  }

  const incomingUserGroups = incomingGroups.filter((group) => !group.isPluginDefault);
  if (areGroupListsEqual(incomingUserGroups, pendingUserGroups.groups)) {
    return {
      groups: incomingGroups,
      pendingUserGroups: null,
    };
  }

  return {
    groups: replaceUserGroups(incomingGroups, pendingUserGroups.groups),
    pendingUserGroups,
  };
}
