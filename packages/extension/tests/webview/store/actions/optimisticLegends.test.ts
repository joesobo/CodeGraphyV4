import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHarness } from './harness';

describe('webview/store/actions/optimisticLegends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges optimistic group updates and refreshes the expiry', () => {
    const { actions, getState } = createHarness();

    actions.setOptimisticLegendUpdate('docs', { pattern: 'docs/**' });
    actions.setOptimisticLegendUpdate('docs', { color: '#F59E0B' });

    expect(getState().optimisticLegendUpdates.docs?.updates).toEqual({
      pattern: 'docs/**',
      color: '#F59E0B',
    });
    expect(getState().optimisticLegendUpdates.docs?.expiresAt).toBeGreaterThan(0);
  });

  it('clears an optimistic group update without touching other groups', () => {
    const { actions, getState } = createHarness();

    actions.setOptimisticLegendUpdate('docs', { pattern: 'docs/**' });
    actions.setOptimisticLegendUpdate('src', { pattern: 'src/**' });
    actions.clearOptimisticLegendUpdate('docs');

    expect(getState().optimisticLegendUpdates).toMatchObject({
      src: {
        updates: { pattern: 'src/**' },
      },
    });
    expect(getState().optimisticLegendUpdates.docs).toBeUndefined();
  });

  it('merges batched optimistic group updates into the existing pending state', () => {
    const { actions, getState } = createHarness();

    actions.setOptimisticLegendUpdate('docs', { pattern: 'docs/**' });
    actions.setOptimisticLegendUpdates({
      docs: { color: '#F59E0B' },
      src: { pattern: 'src/**' },
    });

    expect(getState().optimisticLegendUpdates).toMatchObject({
      docs: {
        updates: { pattern: 'docs/**', color: '#F59E0B' },
      },
      src: {
        updates: { pattern: 'src/**' },
      },
    });
  });

  it('replaces user groups while preserving plugin defaults', () => {
    const { actions, getState } = createHarness();

    actions.setOptimisticUserLegends([
      { id: 'custom-a', pattern: 'docs/**', color: '#F59E0B' },
      { id: 'custom-b', pattern: 'notes/**', color: '#38BDF8' },
    ]);

    expect(getState().legends).toEqual([
      { id: 'custom-a', pattern: 'docs/**', color: '#F59E0B' },
      { id: 'custom-b', pattern: 'notes/**', color: '#38BDF8' },
      { id: 'plugin:typescript', pattern: '*.ts', color: '#3178C6', isPluginDefault: true },
    ]);
    expect(getState().optimisticUserLegends?.groups).toEqual([
      { id: 'custom-a', pattern: 'docs/**', color: '#F59E0B' },
      { id: 'custom-b', pattern: 'notes/**', color: '#38BDF8' },
    ]);
  });
});
