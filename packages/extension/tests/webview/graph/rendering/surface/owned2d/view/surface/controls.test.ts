import { describe, expect, it, vi } from 'vitest';
import type { FGNode } from '../../../../../../../../src/webview/components/graph/model/build';
import { advanceOwnedGraphCameraTransition } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/camera/runtime/model';
import { createOwnedGraphControls, type OwnedGraphControlsRuntime } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/view/surface/controls';
import type { OwnedGraphLayout } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout/runtime/model';
import { createGraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import { createGraphLayoutFixedTimestepClock } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/simulation/timing/clock';

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
    links: [],
    baseStyleRevision: 0, membershipRevision: 0,
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
      simulationClockRef: { current: createGraphLayoutFixedTimestepClock() },
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
    controls.zoom(2);
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

  it('honors camera durations for smooth zoom, centering, and fit', () => {
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
    vi.spyOn(performance, 'now').mockReturnValue(100);
    const controls = createOwnedGraphControls(fixture.runtime, canvas);

    controls.centerAt(10, 20, 300);
    controls.zoom(4, 300);
    expect(fixture.runtime.cameraRef.current).toMatchObject({
      centerX: 0,
      centerY: 0,
      zoom: 1,
    });
    expect(controls.zoom()).toBe(1);
    expect(fixture.runtime.cameraRef.current.transition?.target.zoom).toBe(4);
    expect(advanceOwnedGraphCameraTransition(
      fixture.runtime.cameraRef.current,
      250,
    )).toBe(true);
    expect(fixture.runtime.cameraRef.current.centerX).toBeCloseTo(8.75, 8);
    expect(fixture.runtime.cameraRef.current.centerY).toBeCloseTo(17.5, 8);

    controls.centerAt(0, 0, 0);
    controls.zoom(1, 0);
    controls.zoomToFit(300, 0);
    expect(fixture.runtime.cameraRef.current.zoom).toBe(1);
    expect(controls.zoom()).toBe(1);
    expect(fixture.runtime.cameraRef.current.transition?.target.zoom).toBe(10);
    expect(advanceOwnedGraphCameraTransition(
      fixture.runtime.cameraRef.current,
      400,
    )).toBe(false);
    expect(fixture.runtime.cameraRef.current).toMatchObject({
      centerX: 0,
      centerY: 0,
      zoom: 10,
    });
  });

  it('accumulates repeated zoom steps against the pending destination', () => {
    const fixture = runtime();
    const canvas = document.createElement('canvas');
    vi.spyOn(performance, 'now').mockReturnValue(100);
    const controls = createOwnedGraphControls(fixture.runtime, canvas);

    controls.zoomBy(2, 300);
    controls.zoomBy(2, 300);

    expect(controls.zoom()).toBe(1);
    expect(fixture.runtime.cameraRef.current.transition?.target.zoom).toBe(4);
  });

  it('applies camera commands immediately when reduced motion is preferred', () => {
    const fixture = runtime();
    const canvas = document.createElement('canvas');
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    const controls = createOwnedGraphControls(fixture.runtime, canvas);

    controls.centerAt(10, 20, 300);
    controls.zoom(2, 300);

    expect(fixture.runtime.cameraRef.current).toMatchObject({
      centerX: 10,
      centerY: 20,
      transition: null,
      zoom: 2,
    });
  });
});
