import type { IGroup } from '../../../shared/settings/groups';
import type { PendingGroupUpdate, PendingGroupUpdates } from './groups';

const OPTIMISTIC_GROUP_UPDATE_TTL_MS = 2000;

export function mergePendingGroupUpdate(
  current: PendingGroupUpdates,
  groupId: string,
  updates: Partial<IGroup>,
  now: number = Date.now(),
): PendingGroupUpdates {
  return {
    ...current,
    [groupId]: {
      updates: {
        ...current[groupId]?.updates,
        ...updates,
      },
      expiresAt: now + OPTIMISTIC_GROUP_UPDATE_TTL_MS,
    },
  };
}

export function clearPendingGroupUpdate(
  current: PendingGroupUpdates,
  groupId: string,
): PendingGroupUpdates {
  const next = { ...current };
  delete next[groupId];
  return next;
}

function groupMatchesPendingUpdate(group: IGroup, updates: Partial<IGroup>): boolean {
  return Object.entries(updates).every(([key, value]) => {
    const groupKey = key as keyof IGroup;
    return group[groupKey] === value;
  });
}

function shouldKeepPendingUpdate(
  groupIndex: number,
  pending: PendingGroupUpdate,
  now: number,
): boolean {
  return pending.expiresAt > now && groupIndex === -1;
}

export function applyPendingGroupUpdates(
  incomingGroups: IGroup[],
  pendingUpdates: PendingGroupUpdates,
  now: number = Date.now(),
): {
  groups: IGroup[];
  pendingUpdates: PendingGroupUpdates;
} {
  const groups = [...incomingGroups];
  const nextPendingUpdates: PendingGroupUpdates = {};

  for (const [groupId, pending] of Object.entries(pendingUpdates)) {
    const groupIndex = groups.findIndex((group) => group.id === groupId);

    if (shouldKeepPendingUpdate(groupIndex, pending, now)) {
      nextPendingUpdates[groupId] = pending;
      continue;
    }

    if (pending.expiresAt <= now || groupIndex === -1) {
      continue;
    }

    const group = groups[groupIndex];
    if (groupMatchesPendingUpdate(group, pending.updates)) {
      continue;
    }

    groups[groupIndex] = {
      ...group,
      ...pending.updates,
    };
    nextPendingUpdates[groupId] = pending;
  }

  return { groups, pendingUpdates: nextPendingUpdates };
}
