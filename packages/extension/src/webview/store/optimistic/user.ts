import type { IGroup } from '../../../shared/settings/groups';
import type { PendingUserGroupsUpdate } from './groups';
import { areGroupListsEqual, replaceUserGroups } from '../userGroupLists';

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
