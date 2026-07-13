import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  renderOwnedGraphFrame,
  type OwnedGraphFrameRuntime,
} from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame';
import type { OwnedGraphLayout } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout';
import { createGraphLayoutEngine } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';
import type { OwnedWebGpuFrame, OwnedWebGpuRenderer } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/webgpu/renderer';
import { createDefaultSurfaceProps } from '../view/surfaceFixture';

function canvasFixture(): HTMLCanvasElement {
  const context = {
    clearRect: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    translate: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  return {
    getBoundingClientRect: () => ({ height: 400, width: 600 }),
    getContext: () => context,
    height: 0,
    width: 0,
  } as unknown as HTMLCanvasElement;
}

function runtimeFixture(renderer: OwnedWebGpuRenderer): {
  layout: OwnedGraphLayout;
  node: FGNode;
  runtime: OwnedGraphFrameRuntime;
} {
  const node = {
    baseOpacity: 1,
    borderColor: '#000000',
    borderWidth: 1,
    color: '#93c5fd',
    id: 'a',
    isFavorite: false,
    isPinned: false,
    label: 'a',
    size: 4,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
  } as FGNode;
  const engine = createGraphLayoutEngine({
    nodeIds: [node.id],
    initialX: Float32Array.of(0),
    initialY: Float32Array.of(0),
    radii: Float32Array.of(4),
    edgeSources: new Uint32Array(),
    edgeTargets: new Uint32Array(),
  });
  const layout: OwnedGraphLayout = {
    engine,
    kind: 'main-thread',
    links: [],
    nodes: [node],
  };
  const props = createDefaultSurfaceProps();
  props.sharedProps.graphData = { links: [], nodes: [node] };
  const runtime: OwnedGraphFrameRuntime = {
    cameraRef: { current: { centerX: 0, centerY: 0, zoom: 1 } },
    engineStopNotifiedRef: { current: false },
    fpsRef: { current: null },
    gpuRendererRef: { current: renderer },
    layoutRef: { current: layout },
    onRendererError: vi.fn(),
    pluginKinematicsVersionRef: { current: -1 },
    pluginForcesRef: { current: {
      active: () => true,
      dispose: vi.fn(),
      sync: vi.fn(() => false),
      tick: vi.fn(() => {
        node.x = 12;
        node.y = 13;
        node.vx = 2;
        node.vy = 3;
      }),
    } },
    positionVersionRef: { current: 0 },
    propsRef: { current: props },
    rendererOperationalRef: { current: true },
    requestFrameRef: { current: vi.fn() },
    recordRenderedFrame: vi.fn(),
    skipPhysicsFrameRef: { current: false },
    styleVersionRef: { current: 1 },
    synchronizedPositionVersionRef: { current: -1 },
  };
  return { layout, node, runtime };
}

afterEach(() => {
  delete (window as typeof window & { __CODEGRAPHY_WEBGPU_PERF__?: unknown }).__CODEGRAPHY_WEBGPU_PERF__;
});

describe('owned graph frame execution', () => {
  it('runs frame phases in order and publishes bounded performance samples', () => {
    let submittedFrame: OwnedWebGpuFrame | undefined;
    const renderer = {
      render: vi.fn((frame: OwnedWebGpuFrame) => {
        submittedFrame = frame;
        frame.getNodeStyle(frame.nodes[0]);
      }),
    } as unknown as OwnedWebGpuRenderer;
    const { layout, node, runtime } = runtimeFixture(renderer);
    const samples: Array<Record<string, number>> = [];
    (window as typeof window & { __CODEGRAPHY_WEBGPU_PERF__?: Array<Record<string, number>> })
      .__CODEGRAPHY_WEBGPU_PERF__ = samples;

    expect(renderOwnedGraphFrame(runtime, canvasFixture(), 100, null)).toBe(100);
    expect(runtime.recordRenderedFrame).not.toHaveBeenCalled();

    expect(runtime.pluginForcesRef.current.tick).toHaveBeenCalled();
    expect([layout.engine.x[0], layout.engine.y[0]]).not.toEqual([0, 0]);
    expect(node.x).toBe(layout.engine.x[0]);
    expect(renderer.render).toHaveBeenCalledOnce();
    expect(submittedFrame).toMatchObject({ positionVersion: 1, styleVersion: 1 });
    expect(runtime.propsRef.current.nodeLabelCanvasObject).toHaveBeenCalledWith(
      node,
      expect.anything(),
      1,
    );
    expect(runtime.propsRef.current.onRenderFramePost).toHaveBeenCalled();
    expect(samples).toHaveLength(1);
    expect(samples[0]).toEqual(expect.objectContaining({
      gpuMs: expect.any(Number),
      overlayMs: expect.any(Number),
      physicsMs: expect.any(Number),
      syncMs: expect.any(Number),
    }));
    expect(runtime.requestFrameRef.current).toHaveBeenCalled();
  });

  it('renders interpolated worker positions while keeping layout nodes authoritative', () => {
    let submittedFrame: OwnedWebGpuFrame | undefined;
    const renderer = {
      render: vi.fn((frame: OwnedWebGpuFrame) => { submittedFrame = frame; }),
    } as unknown as OwnedWebGpuRenderer;
    const { layout, node, runtime } = runtimeFixture(renderer);
    runtime.pluginForcesRef.current.active = () => false;
    layout.engine.pause();
    layout.engine.sampleRenderPositions = vi.fn(() => ({
      needsFrame: true,
      version: 7,
      x: Float32Array.of(100),
      y: Float32Array.of(200),
    }));

    renderOwnedGraphFrame(runtime, canvasFixture(), 150, 100);

    expect(submittedFrame?.renderX?.[0]).toBe(100);
    expect(submittedFrame?.renderY?.[0]).toBe(200);
    expect(submittedFrame?.positionVersion).toBe(7);
    expect(node.x).toBe(layout.engine.x[0]);
    expect(runtime.requestFrameRef.current).toHaveBeenCalled();
  });

  it('bridges plugin kinematics once per worker snapshot without invalidating in-flight ticks', () => {
    const renderer = { render: vi.fn() } as unknown as OwnedWebGpuRenderer;
    const { layout, runtime } = runtimeFixture(renderer);
    layout.kind = 'worker';
    vi.spyOn(layout.engine, 'tick').mockReturnValue({ moving: true, settled: false, steps: 0 });
    const setKinematics = vi.spyOn(layout.engine, 'setKinematics');

    renderOwnedGraphFrame(runtime, canvasFixture(), 100, null);
    renderOwnedGraphFrame(runtime, canvasFixture(), 116, 100);

    expect(runtime.pluginForcesRef.current.tick).toHaveBeenCalledOnce();
    expect(setKinematics).toHaveBeenCalledOnce();
    expect(runtime.positionVersionRef.current).toBe(1);
  });

  it('submits only enough idle frames to establish the initial FPS sample', () => {
    const renderer = { render: vi.fn() } as unknown as OwnedWebGpuRenderer;
    const { runtime } = runtimeFixture(renderer);
    runtime.layoutRef.current?.engine.pause();
    runtime.propsRef.current.showFps = true;

    renderOwnedGraphFrame(runtime, canvasFixture(), 100, null);

    expect(runtime.recordRenderedFrame).toHaveBeenCalledWith(100);
    expect(runtime.requestFrameRef.current).toHaveBeenCalledOnce();

    runtime.fpsRef.current = 50;
    vi.mocked(runtime.requestFrameRef.current).mockClear();
    renderOwnedGraphFrame(runtime, canvasFixture(), 120, 100);

    expect(runtime.requestFrameRef.current).not.toHaveBeenCalled();
  });

  it('does not advance frame time before layout prerequisites exist', () => {
    const renderer = { render: vi.fn() } as unknown as OwnedWebGpuRenderer;
    const { runtime } = runtimeFixture(renderer);
    runtime.layoutRef.current = null;

    expect(renderOwnedGraphFrame(runtime, canvasFixture(), 100, 50)).toBe(50);
    expect(runtime.recordRenderedFrame).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled();
  });

  it('disposes a failed renderer, pauses physics, and reports the failure', () => {
    const renderer = {
      dispose: vi.fn(),
      render: vi.fn(() => { throw new Error('submission failed'); }),
    } as unknown as OwnedWebGpuRenderer;
    const { layout, runtime } = runtimeFixture(renderer);

    expect(renderOwnedGraphFrame(runtime, canvasFixture(), 100, null)).toBe(100);
    expect(runtime.recordRenderedFrame).not.toHaveBeenCalled();

    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(runtime.gpuRendererRef.current).toBeNull();
    expect(runtime.rendererOperationalRef.current).toBe(false);
    expect(runtime.onRendererError).toHaveBeenCalledWith('submission failed');
    expect(layout.engine.tick(1000 / 60).steps).toBe(0);
    expect(runtime.requestFrameRef.current).not.toHaveBeenCalled();
  });
});
