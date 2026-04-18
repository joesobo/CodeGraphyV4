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

  it('updates a single physics setting at the requested configuration target', async () => {
    const update = vi.fn(() => Promise.resolve());

    await updateGraphViewPhysicsSetting('damping', 0.35, {
      getConfiguration: () => ({ update }),
      getConfigTarget: () => 'workspace-folder-target',
    });

    expect(update).toHaveBeenCalledWith('physics.damping', 0.35, 'workspace-folder-target');
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

  it('resets every persisted physics setting at the requested configuration target', async () => {
    const update = vi.fn(() => Promise.resolve());

    await resetGraphViewPhysicsSettings({
      getConfiguration: () => ({ update }),
      getConfigTarget: () => 'workspace-folder-target',
    });

    expect(update.mock.calls).toEqual([
      ['physics.repelForce', undefined, 'workspace-folder-target'],
      ['physics.linkDistance', undefined, 'workspace-folder-target'],
      ['physics.linkForce', undefined, 'workspace-folder-target'],
      ['physics.damping', undefined, 'workspace-folder-target'],
      ['physics.centerForce', undefined, 'workspace-folder-target'],
    ]);
  });
});
