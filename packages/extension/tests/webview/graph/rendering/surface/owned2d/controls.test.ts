import { describe, expect, it, vi } from 'vitest';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import { createOwnedGraphControls, type OwnedGraphControlsRuntime } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/controls';
import type { OwnedGraphLayout } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout';
import { createGraphLayoutEngine } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';

function runtime(): { runtime: OwnedGraphControlsRuntime; node: FGNode } {
  const node = { id: 'node', size: 4, x: 0, y: 0 } as FGNode;
  const layout: OwnedGraphLayout = {
    engine: createGraphLayoutEngine({
      nodeIds: [node.id],
      initialX: Float32Array.of(0),
      initialY: Float32Array.of(0),
      radii: Float32Array.of(4),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }),
    kind: 'main-thread',
    links: [],
    nodes: [node],
  };
  return {
    node,
    runtime: {
      cameraRef: { current: { centerX: 0, centerY: 0, zoom: 1 } },
      clearLinkHover: vi.fn(() => true),
      engineStopNotifiedRef: { current: true },
      fpsRef: { current: 58 },
      layoutRef: { current: layout },
      positionVersionRef: { current: 0 },
      rendererOperationalRef: { current: false },
      requestFrameRef: { current: vi.fn() },
    },
  };
}

describe('owned graph controls', () => {
  it('owns camera transforms, operational resume gating, and viewport-node invalidation', () => {
    const fixture = runtime();
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      bottom: 80,
      height: 80,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const controls = createOwnedGraphControls(fixture.runtime, canvas);
    const resume = vi.spyOn(fixture.runtime.layoutRef.current!.engine, 'resume');

    controls.centerAt(10, 20);
    expect(fixture.runtime.cameraRef.current).toMatchObject({ centerX: 10, centerY: 20 });
    expect(fixture.runtime.clearLinkHover).toHaveBeenCalledOnce();
    expect(fixture.runtime.requestFrameRef.current).toHaveBeenCalledOnce();
    expect(controls.getFps()).toBe(58);
    expect(controls.graph2ScreenCoords(10, 20)).toEqual({ x: 50, y: 40 });
    expect(controls.screen2GraphCoords(50, 40)).toEqual({ x: 10, y: 20 });
    expect(controls.zoom(2)).toBe(controls);
    expect(controls.zoom()).toBe(2);

    controls.resumeAnimation();
    expect(resume).not.toHaveBeenCalled();
    fixture.runtime.rendererOperationalRef.current = true;
    controls.resumeAnimation();
    expect(resume).toHaveBeenCalledOnce();

    expect(controls.updateNode(fixture.node.id, { x: 30, y: 40 })).toBe(true);
    expect(fixture.runtime.positionVersionRef.current).toBe(1);
    expect(fixture.runtime.engineStopNotifiedRef.current).toBe(false);
    expect(fixture.runtime.requestFrameRef.current).toHaveBeenCalled();
  });
});
