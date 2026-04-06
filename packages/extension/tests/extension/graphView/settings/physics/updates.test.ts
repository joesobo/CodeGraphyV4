import { describe, expect, it, vi } from 'vitest';
import {
  resetGraphViewPhysicsSettings,
  updateGraphViewPhysicsSetting,
} from '../../../../../src/extension/graphView/settings/physics/updates';

describe('graph view physics update helpers', () => {
  it('updates a single physics setting using the graph-view config target', async () => {
    const update = vi.fn(() => Promise.resolve());

    await updateGraphViewPhysicsSetting('repelForce', 25, {
      getConfiguration: () => ({ update }),
      getConfigTarget: () => 'workspace',
    });

    expect(update).toHaveBeenCalledWith('repelForce', 25, 'workspace');
  });

  it('resets every persisted physics setting back to the config default', async () => {
    const update = vi.fn(() => Promise.resolve());

    await resetGraphViewPhysicsSettings({
      getConfiguration: () => ({ update }),
      getConfigTarget: () => 'workspace',
    });

    expect(update.mock.calls).toEqual([
      ['repelForce', undefined, 'workspace'],
      ['linkDistance', undefined, 'workspace'],
      ['linkForce', undefined, 'workspace'],
      ['damping', undefined, 'workspace'],
      ['centerForce', undefined, 'workspace'],
    ]);
  });
});
