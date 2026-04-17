import type { IGroup } from '../../../shared/settings/groups';
import {
  applyPendingGroupUpdates,
  clearPendingGroupUpdate,
  mergePendingGroupUpdate,
} from './pending';
import {
  applyPendingUserGroupsUpdate,
  createPendingUserGroupsUpdate,
} from './user';

export interface PendingGroupUpdate {
  updates: Partial<IGroup>;
  expiresAt: number;
}

export type PendingGroupUpdates = Record<string, PendingGroupUpdate>;

export interface PendingUserGroupsUpdate {
  groups: IGroup[];
  expiresAt: number;
}
export {
  applyPendingGroupUpdates,
  applyPendingUserGroupsUpdate,
  clearPendingGroupUpdate,
  createPendingUserGroupsUpdate,
  mergePendingGroupUpdate,
};
