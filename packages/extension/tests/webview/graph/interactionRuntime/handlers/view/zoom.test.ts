import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { zoomGraphView } from '../../../../../../src/webview/components/graph/interactionRuntime/handlers/view/zoom';
import { createInteractionDependencies, createRef } from '../../testUtils';

describe('graph/interactionRuntime/zoom', () => {
  it('scales the current 2d zoom by the requested factor', () => {
    const dependencies = createInteractionDependencies();
    const zoom = dependencies.fg2dRef.current!.zoom!;
    zoom.mockImplementationOnce?.(() => 1.5);

    zoomGraphView(dependencies, 0.5);

    expect(dependencies.fg2dRef.current?.zoom).toHaveBeenNthCalledWith(1);
    expect(dependencies.fg2dRef.current?.zoom).toHaveBeenNthCalledWith(2, 0.75, 150);
  });

  it('does nothing when the 2d graph ref is missing during zoom', () => {
    const dependencies = createInteractionDependencies({
      fg2dRef: { current: undefined },
    });

    expect(() => zoomGraphView(dependencies, 2)).not.toThrow();
  });

  it('moves the 3d camera closer to the current target when zooming in', () => {
    const target = { x: 10, y: 20, z: 30 };
    const cameraPosition = vi.fn();
    const dependencies = createInteractionDependencies({
      graphMode: '3d',
      fg3dRef: createRef({
        camera: vi.fn(() => ({ position: { x: 10, y: 20, z: 130 } })),
        cameraPosition,
        controls: vi.fn(() => ({ target })),
        getGraphBbox: vi.fn(() => ({ x: [0, 100], y: [0, 0], z: [0, 0] })),
      } as never),
    });

    zoomGraphView(dependencies, 2);

    expect(cameraPosition).toHaveBeenCalledWith(
      { x: 10, y: 20, z: 80 },
      target,
      150,
    );
    expect(dependencies.fg2dRef.current?.zoom).not.toHaveBeenCalled();
  });

  it('clamps 3d zoom-out distance relative to the graph bounds', () => {
    const cameraPosition = vi.fn();
    const dependencies = createInteractionDependencies({
      graphMode: '3d',
      fg3dRef: createRef({
        camera: vi.fn(() => ({ position: { x: 0, y: 0, z: 500 } })),
        cameraPosition,
        controls: vi.fn(() => ({ target: { x: 0, y: 0, z: 0 } })),
        getGraphBbox: vi.fn(() => ({ x: [-50, 50], y: [0, 0], z: [0, 0] })),
      } as never),
    });

    zoomGraphView(dependencies, 0.5);

    expect(cameraPosition).toHaveBeenCalledWith(
      { x: 0, y: 0, z: 400 },
      { x: 0, y: 0, z: 0 },
      150,
    );
  });

  it('tolerates a missing 3d graph ref when zooming', () => {
    const dependencies = createInteractionDependencies({
      graphMode: '3d',
      fg3dRef: { current: undefined },
    });

    expect(() => zoomGraphView(dependencies, 2)).not.toThrow();
  });

  it('ignores non-positive zoom factors in 3d mode', () => {
    const cameraPosition = vi.fn();
    const dependencies = createInteractionDependencies({
      graphMode: '3d',
      fg3dRef: createRef({
        camera: vi.fn(() => ({ position: { x: 0, y: 0, z: 10 } })),
        cameraPosition,
        controls: vi.fn(() => ({ target: { x: 0, y: 0, z: 0 } })),
        getGraphBbox: vi.fn(() => ({ x: [0, 1], y: [0, 1], z: [0, 1] })),
      } as never),
    });

    zoomGraphView(dependencies, 0);
    zoomGraphView(dependencies, -1);

    expect(cameraPosition).not.toHaveBeenCalled();
  });

  it('uses the graph bounds center when 3d controls do not expose a valid target', () => {
    const cameraPosition = vi.fn();
    const dependencies = createInteractionDependencies({
      graphMode: '3d',
      fg3dRef: createRef({
        camera: vi.fn(() => ({ position: { x: 10, y: 10, z: 60 } })),
        cameraPosition,
        controls: vi.fn(() => ({ target: { x: Number.NaN, y: 0, z: 0 } })),
        getGraphBbox: vi.fn(() => ({ x: [0, 20], y: [0, 20], z: [0, 20] })),
      } as never),
    });

    zoomGraphView(dependencies, 2);

    expect(cameraPosition.mock.calls[0]?.[1]).toEqual({ x: 10, y: 10, z: 10 });
  });

  it('falls back to the origin when 3d target and bounds are invalid', () => {
    const cameraPosition = vi.fn();
    const dependencies = createInteractionDependencies({
      graphMode: '3d',
      fg3dRef: createRef({
        camera: vi.fn(() => ({ position: { x: 0, y: 0, z: 20 } })),
        cameraPosition,
        controls: vi.fn(() => ({ target: undefined })),
        getGraphBbox: vi.fn(() => ({ x: [0, 1, 2], y: [0, 1], z: [0, 1] })),
      } as never),
    });

    zoomGraphView(dependencies, 2);

    expect(cameraPosition).toHaveBeenCalledWith(
      { x: 0, y: 0, z: 10 },
      { x: 0, y: 0, z: 0 },
      150,
    );
  });

  it('uses the forward z axis when the 3d camera is already on the target', () => {
    const cameraPosition = vi.fn();
    const dependencies = createInteractionDependencies({
      graphMode: '3d',
      fg3dRef: createRef({
        camera: vi.fn(() => ({ position: { x: 5, y: 6, z: 7 } })),
        cameraPosition,
        controls: vi.fn(() => ({ target: { x: 5, y: 6, z: 7 } })),
        getGraphBbox: vi.fn(() => undefined),
      } as never),
    });

    zoomGraphView(dependencies, 2);

    expect(cameraPosition).toHaveBeenCalledWith(
      { x: 5, y: 6, z: 7.25 },
      { x: 5, y: 6, z: 7 },
      150,
    );
  });

  it('zooms a diagonal 3d camera path across x and y axes', () => {
    const cameraPosition = vi.fn();
    const dependencies = createInteractionDependencies({
      graphMode: '3d',
      fg3dRef: createRef({
        camera: vi.fn(() => ({ position: { x: 4, y: 6, z: 3 } })),
        cameraPosition,
        controls: vi.fn(() => ({ target: { x: 1, y: 2, z: 3 } })),
        getGraphBbox: vi.fn(() => undefined),
      } as never),
    });

    zoomGraphView(dependencies, 2);

    expect(cameraPosition).toHaveBeenCalledWith(
      { x: 2.5, y: 4, z: 3 },
      { x: 1, y: 2, z: 3 },
      150,
    );
  });
});
