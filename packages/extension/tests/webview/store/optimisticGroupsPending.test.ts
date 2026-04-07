import { describe, expect, it } from 'vitest';
import {
  applyPendingGroupUpdates,
  clearPendingGroupUpdate,
  mergePendingGroupUpdate,
} from '../../../src/webview/store/optimisticGroupsPending';

describe('webview/store/optimisticGroupsPending', () => {
  it('merges pending updates for the same group id', () => {
    const pending = mergePendingGroupUpdate({}, 'g1', { pattern: '*.tsx' }, 1000);
    const merged = mergePendingGroupUpdate(pending, 'g1', { color: '#ff00ff' }, 1100);

    expect(merged.g1?.updates).toEqual({
      pattern: '*.tsx',
      color: '#ff00ff',
    });
    expect(merged.g1?.expiresAt).toBe(3100);
  });

  it('clears a pending update by group id', () => {
    const pending = mergePendingGroupUpdate({}, 'g1', { pattern: '*.tsx' }, 1000);

    expect(clearPendingGroupUpdate(pending, 'g1')).toEqual({});
  });

  it('keeps stale host data overlaid with pending group updates until they match or expire', () => {
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
});
