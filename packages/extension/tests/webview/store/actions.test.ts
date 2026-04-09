import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_STATE } from '../../../src/webview/store/initialState';
import { createActions } from '../../../src/webview/store/actions';
import type { GraphState } from '../../../src/webview/store/state';

function createHarness() {
  let state = {
    ...INITIAL_STATE,
    groups: [
      { id: 'plugin:typescript', pattern: '*.ts', color: '#3178C6', isPluginDefault: true },
      { id: 'existing', pattern: 'src/**', color: '#22C55E' },
    ],
  } as GraphState;

  const set = vi.fn((update: Parameters<typeof createActions>[0] | Partial<GraphState>) => {
    if (typeof update === 'function') {
      state = { ...state, ...(update as (current: GraphState) => Partial<GraphState>)(state) };
      return;
    }

    state = { ...state, ...update };
  });
  const get = vi.fn(() => state);

  return {
    get,
    getState: () => state,
    set,
    actions: createActions(set as never, get as never),
  };
}

describe('webview/store/actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges optimistic group updates and refreshes the expiry', () => {
    const { actions, getState } = createHarness();

    actions.setOptimisticGroupUpdate('docs', { pattern: 'docs/**' });
    actions.setOptimisticGroupUpdate('docs', { color: '#F59E0B' });

    expect(getState().optimisticGroupUpdates.docs?.updates).toEqual({
      pattern: 'docs/**',
      color: '#F59E0B',
    });
    expect(getState().optimisticGroupUpdates.docs?.expiresAt).toBeGreaterThan(0);
  });

  it('clears an optimistic group update without touching other groups', () => {
    const { actions, getState } = createHarness();

    actions.setOptimisticGroupUpdate('docs', { pattern: 'docs/**' });
    actions.setOptimisticGroupUpdate('src', { pattern: 'src/**' });
    actions.clearOptimisticGroupUpdate('docs');

    expect(getState().optimisticGroupUpdates).toMatchObject({
      src: {
        updates: { pattern: 'src/**' },
      },
    });
    expect(getState().optimisticGroupUpdates.docs).toBeUndefined();
  });

  it('replaces user groups while preserving plugin defaults', () => {
    const { actions, getState } = createHarness();

    actions.setOptimisticUserGroups([
      { id: 'custom-a', pattern: 'docs/**', color: '#F59E0B' },
      { id: 'custom-b', pattern: 'notes/**', color: '#38BDF8' },
    ]);

    expect(getState().groups).toEqual([
      { id: 'custom-a', pattern: 'docs/**', color: '#F59E0B' },
      { id: 'custom-b', pattern: 'notes/**', color: '#38BDF8' },
      { id: 'plugin:typescript', pattern: '*.ts', color: '#3178C6', isPluginDefault: true },
    ]);
    expect(getState().optimisticUserGroups?.groups).toEqual([
      { id: 'custom-a', pattern: 'docs/**', color: '#F59E0B' },
      { id: 'custom-b', pattern: 'notes/**', color: '#38BDF8' },
    ]);
  });

  it('updates every simple scalar setter', () => {
    const { actions, getState } = createHarness();

    actions.setDirectionMode('particles');
    actions.setDirectionColor('#00ff00');
    actions.setParticleSpeed(0.02);
    actions.setParticleSize(8);
    actions.setPhysicsPaused(true);
    actions.setBidirectionalMode('combined');
    actions.setDepthMode(true);
    actions.setDagMode('td');
    actions.setMaxFiles(1200);
    actions.setPlaybackSpeed(1.75);
    actions.setIsPlaying(true);

    expect(getState()).toMatchObject({
      bidirectionalMode: 'combined',
      dagMode: 'td',
      depthMode: true,
      directionColor: '#00ff00',
      directionMode: 'particles',
      isPlaying: true,
      maxFiles: 1200,
      particleSize: 8,
      particleSpeed: 0.02,
      playbackSpeed: 1.75,
      physicsPaused: true,
    });
  });

  it('routes a known extension message through the matching message handler', () => {
    const { actions, getState } = createHarness();

    actions.handleExtensionMessage({
      type: 'PLAYBACK_SPEED_UPDATED',
      payload: { speed: 1.5 },
    });

    expect(getState().playbackSpeed).toBe(1.5);
  });

  it('ignores unknown extension messages without mutating state', () => {
    const { actions, getState } = createHarness();
    const previousState = getState();

    actions.handleExtensionMessage({ type: 'UNKNOWN_MESSAGE' } as never);

    expect(getState()).toBe(previousState);
  });
});
