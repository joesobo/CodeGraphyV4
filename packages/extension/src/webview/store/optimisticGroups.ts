import type { IGroup } from '../../shared/settings/groups';

const OPTIMISTIC_GROUP_UPDATE_TTL_MS = 2000;

export interface PendingGroupUpdate {
  updates: Partial<IGroup>;
  expiresAt: number;
}

export type PendingGroupUpdates = Record<string, PendingGroupUpdate>;

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
    if (pending.expiresAt <= now) {
      continue;
    }

    const groupIndex = groups.findIndex((group) => group.id === groupId);
    if (groupIndex === -1) {
      nextPendingUpdates[groupId] = pending;
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
