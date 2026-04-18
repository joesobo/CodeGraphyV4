import { describe, expect, it } from 'vitest';
import {
  applyPendingUserGroupsUpdate,
  applyPendingGroupUpdates,
  clearPendingGroupUpdate,
  createPendingUserGroupsUpdate,
  mergePendingGroupUpdate,
} from '../../../src/webview/store/optimistic/groups';

describe('optimisticGroups', () => {
  it('merges pending updates for the same group id', () => {
    const pending = mergePendingGroupUpdate({}, 'g1', { pattern: '*.tsx' }, 1000);
    const merged = mergePendingGroupUpdate(pending, 'g1', { color: '#ff00ff' }, 1100);

    expect(merged.g1?.updates).toEqual({
      pattern: '*.tsx',
      color: '#ff00ff',
    });
    expect(merged.g1?.expiresAt).toBe(3100);
  });

  it('keeps pending updates applied when the host payload is stale', () => {
    const pending = mergePendingGroupUpdate({}, 'g1', { pattern: '*.tsx' }, 1000);

    expect(
      applyPendingGroupUpdates(
        [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
        pending,
        1500,
      ),
    ).toEqual({
      groups: [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
      pendingUpdates: pending,
    });
  });

  it('drops pending updates once the host payload matches them', () => {
    const pending = mergePendingGroupUpdate({}, 'g1', { pattern: '*.tsx' }, 1000);

    expect(
      applyPendingGroupUpdates(
        [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
        pending,
        1500,
      ),
    ).toEqual({
      groups: [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
      pendingUpdates: {},
    });
  });

  it('clears a pending update by group id', () => {
    const pending = mergePendingGroupUpdate({}, 'g1', { pattern: '*.tsx' }, 1000);

    expect(clearPendingGroupUpdate(pending, 'g1')).toEqual({});
  });

  it('keeps a pending user-group list applied when the host payload is stale', () => {
    const pending = createPendingUserGroupsUpdate(
      [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
      1000,
    );

    expect(
      applyPendingUserGroupsUpdate(
        [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
        pending,
        1500,
      ),
    ).toEqual({
      groups: [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
      pendingUserGroups: pending,
    });
  });

  it('clears a pending user-group list once the host payload matches it', () => {
    const pending = createPendingUserGroupsUpdate(
      [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
      1000,
    );

    expect(
      applyPendingUserGroupsUpdate(
        [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
        pending,
        1500,
      ),
    ).toEqual({
      groups: [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
      pendingUserGroups: null,
    });
  });
});
