import { describe, expect, it, vi } from 'vitest';
import { panToNodeById } from '../../../../../../src/webview/components/graph/interactionRuntime/handlers/view/pan';
import { createInteractionDependencies } from '../../testUtils';

describe('graph/interactionRuntime/pan', () => {
  it('centers a 2d node without changing zoom', () => {
    const dependencies = createInteractionDependencies({ graphMode: '2d' });

    panToNodeById(dependencies, 'src/utils.ts');

    expect(dependencies.fg2dRef.current?.centerAt).toHaveBeenCalledWith(100, 0, 300);
    expect(dependencies.fg2dRef.current?.zoom).not.toHaveBeenCalled();
  });

  it('translates a 3d camera while preserving its offset from the target', () => {
    const cameraPosition = vi.fn();
    const dependencies = createInteractionDependencies({
      graphMode: '3d',
      fg3dRef: {
        current: {
          camera: () => ({ position: { x: 10, y: 20, z: 30 } }),
          cameraPosition,
          controls: () => ({ target: { x: 1, y: 2, z: 3 } }),
        } as never,
      },
    });
    dependencies.graphDataRef.current.nodes[1] = {
      ...dependencies.graphDataRef.current.nodes[1],
      x: 100,
      y: 50,
      z: 5,
    };

    panToNodeById(dependencies, 'src/utils.ts');

    expect(cameraPosition).toHaveBeenCalledWith(
      { x: 109, y: 68, z: 32 },
      { x: 100, y: 50, z: 5 },
      300,
    );
  });
});
