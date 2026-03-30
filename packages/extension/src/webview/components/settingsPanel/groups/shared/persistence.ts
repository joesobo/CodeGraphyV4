import type React from 'react';
import type { IGroup } from '../../../../../shared/settings/groups';

const COLOR_DEBOUNCE_MS = 300;

type TimeoutMap = React.MutableRefObject<Record<string, ReturnType<typeof setTimeout>>>;
type OverrideSetter = React.Dispatch<React.SetStateAction<Record<string, string>>>;

interface GroupPersistenceDependencies {
  colorDebounceRef: TimeoutMap;
  overridePluginGroup: (group: IGroup, updates: Partial<IGroup>) => void;
  patternDebounceRef: TimeoutMap;
  setLocalColorOverrides: OverrideSetter;
  setLocalPatternOverrides: OverrideSetter;
  updateGroup: (groupId: string, updates: Partial<IGroup>) => void;
}

function clearPendingTimer(ref: TimeoutMap, id: string): void {
  if (ref.current[id]) {
    clearTimeout(ref.current[id]);
  }
}

function clearLocalOverride(
  setOverrides: OverrideSetter,
  ref: TimeoutMap,
  id: string,
): void {
  setOverrides((current) => {
    const next = { ...current };
    delete next[id];
    return next;
  });
  delete ref.current[id];
}

function scheduleOverride(
  id: string,
  value: string,
  ref: TimeoutMap,
  setOverrides: OverrideSetter,
  persist: () => void,
): void {
  setOverrides((current) => ({ ...current, [id]: value }));
  clearPendingTimer(ref, id);
  ref.current[id] = setTimeout(() => {
    persist();
    clearLocalOverride(setOverrides, ref, id);
  }, COLOR_DEBOUNCE_MS);
}

export function clearTimeoutMap(ref: TimeoutMap): void {
  for (const timer of Object.values(ref.current)) {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export function createGroupPersistenceHandlers(
  dependencies: GroupPersistenceDependencies,
): {
  changeGroupColor: (groupId: string, color: string) => void;
  changeGroupPattern: (groupId: string, pattern: string) => void;
  changePluginGroupColor: (group: IGroup, color: string) => void;
} {
  return {
    changeGroupColor: (groupId: string, color: string) => {
      scheduleOverride(
        groupId,
        color,
        dependencies.colorDebounceRef,
        dependencies.setLocalColorOverrides,
        () => {
          dependencies.updateGroup(groupId, { color });
        },
      );
    },
    changeGroupPattern: (groupId: string, pattern: string) => {
      scheduleOverride(
        groupId,
        pattern,
        dependencies.patternDebounceRef,
        dependencies.setLocalPatternOverrides,
        () => {
          dependencies.updateGroup(groupId, { pattern });
        },
      );
    },
    changePluginGroupColor: (group: IGroup, color: string) => {
      scheduleOverride(
        group.id,
        color,
        dependencies.colorDebounceRef,
        dependencies.setLocalColorOverrides,
        () => {
          dependencies.overridePluginGroup(group, { color });
        },
      );
    },
  };
}
