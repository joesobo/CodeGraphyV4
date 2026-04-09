import { describe, expect, it, vi } from 'vitest';
import {
  resetGraphViewPhysicsSettings,
  updateGraphViewPhysicsSetting,
} from '../../../../../src/extension/graphView/settings/physics/updates';

describe('graph view physics update helpers', () => {
  it('updates a single physics setting in repo-local settings', async () => {
    const update = vi.fn(() => Promise.resolve());

    await updateGraphViewPhysicsSetting('repelForce', 25, {
      getConfiguration: () => ({ update }),
    });

    expect(update).toHaveBeenCalledWith('physics.repelForce', 25);
  });

  it('resets every persisted physics setting back to the config default', async () => {
    const update = vi.fn(() => Promise.resolve());

    await resetGraphViewPhysicsSettings({
      getConfiguration: () => ({ update }),
    });

    expect(update.mock.calls).toEqual([
      ['physics.repelForce', undefined],
      ['physics.linkDistance', undefined],
      ['physics.linkForce', undefined],
      ['physics.damping', undefined],
      ['physics.centerForce', undefined],
    ]);
  });
});
