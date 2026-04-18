import { describe, expect, it } from 'vitest';
import {
  applyPendingGroupUpdates,
  clearPendingGroupUpdate,
  mergePendingGroupUpdate,
} from '../../../../src/webview/store/optimistic/pending';

describe('webview/store/optimistic/pending', () => {
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

  it('applies a pending update when only part of the payload matches', () => {
    const pending = mergePendingGroupUpdate(
      {},
      'g1',
      { pattern: '*.tsx', color: '#ff00ff' },
      1000,
    );

    expect(
      applyPendingGroupUpdates(
        [{ id: 'g1', pattern: '*.tsx', color: '#3178C6' }],
        pending,
        1500,
      ),
    ).toEqual({
      groups: [{ id: 'g1', pattern: '*.tsx', color: '#ff00ff' }],
      pendingUpdates: pending,
    });
  });

  it('keeps a pending update alive while the host payload has not echoed the group yet', () => {
    const pending = mergePendingGroupUpdate({}, 'g1', { pattern: '*.tsx' }, 1000);

    expect(
      applyPendingGroupUpdates(
        [{ id: 'g2', pattern: '*.ts', color: '#3178C6' }],
        pending,
        1500,
      ),
    ).toEqual({
      groups: [{ id: 'g2', pattern: '*.ts', color: '#3178C6' }],
      pendingUpdates: pending,
    });
  });

  it('drops pending updates when the expiry matches now exactly', () => {
    const pending = mergePendingGroupUpdate({}, 'g1', { pattern: '*.tsx' }, 1000);

    expect(
      applyPendingGroupUpdates(
        [{ id: 'g2', pattern: '*.ts', color: '#3178C6' }],
        pending,
        3000,
      ),
    ).toEqual({
      groups: [{ id: 'g2', pattern: '*.ts', color: '#3178C6' }],
      pendingUpdates: {},
    });
  });

  it('drops pending group updates once they expire even if the host payload is missing the group', () => {
    const pending = mergePendingGroupUpdate({}, 'g1', { pattern: '*.tsx' }, 1000);

    expect(
      applyPendingGroupUpdates(
        [{ id: 'g2', pattern: '*.ts', color: '#3178C6' }],
        pending,
        4000,
      ),
    ).toEqual({
      groups: [{ id: 'g2', pattern: '*.ts', color: '#3178C6' }],
      pendingUpdates: {},
    });
  });

  it('drops pending updates when the host payload still contains the group but the update expired', () => {
    const pending = mergePendingGroupUpdate({}, 'g1', { pattern: '*.tsx' }, 1000);

    expect(
      applyPendingGroupUpdates(
        [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
        pending,
        4000,
      ),
    ).toEqual({
      groups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
      pendingUpdates: {},
    });
  });

  it('drops pending group updates once the host payload matches them exactly', () => {
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

  it('clears only the requested group while keeping other pending updates intact', () => {
    const pending = mergePendingGroupUpdate(
      mergePendingGroupUpdate({}, 'g1', { pattern: '*.tsx' }, 1000),
      'g2',
      { pattern: '*.ts' },
      1100,
    );

    expect(clearPendingGroupUpdate(pending, 'g1')).toEqual({
      g2: pending.g2,
    });
  });
});
