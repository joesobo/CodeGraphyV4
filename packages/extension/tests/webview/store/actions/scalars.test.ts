import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHarness } from './harness';

describe('webview/store/actions/scalars', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(getState()).toMatchObject({
      bidirectionalMode: 'combined',
      dagMode: 'td',
      depthMode: true,
      directionColor: '#00ff00',
      directionMode: 'particles',
      maxFiles: 1200,
      particleSize: 8,
      particleSpeed: 0.02,
      physicsPaused: true,
    });
  });
});
