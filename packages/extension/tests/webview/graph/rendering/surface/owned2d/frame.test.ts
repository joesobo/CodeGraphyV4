import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  renderOwnedGraphFrame,
  type OwnedGraphFrameRuntime,
} from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame';
import type { OwnedGraphLayout } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout';
import { createGraphLayoutEngine } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';
import { createGraphLayoutFixedTimestepClock } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/fixedTimestep';
import { createOwnedGraphStageAttributionProfiler } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/performance/attribution';
import { createOwnedGraphInteractionRecorder } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/performance/recording';
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
  recorder: ReturnType<typeof createOwnedGraphInteractionRecorder>;
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
    links: [],
    nodes: [node],
  };
  const props = createDefaultSurfaceProps();
  props.sharedProps.graphData = { links: [], nodes: [node] };
  const recorder = createOwnedGraphInteractionRecorder();
  recorder.start({ neighborNodeIds: [], targetNodeId: node.id });
  const runtime: OwnedGraphFrameRuntime = {
    cameraRef: { current: { centerX: 0, centerY: 0, zoom: 1 } },
    engineStopNotifiedRef: { current: false },
    gpuRendererRef: { current: renderer },
    hoveredLinkRef: { current: null },
    layoutRef: { current: layout },
    onRendererError: vi.fn(),
    performanceAttributionRef: { current: createOwnedGraphStageAttributionProfiler() },
    performanceRecorderRef: { current: recorder },
    pointerSessionRef: { current: null },
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
    simulationClockRef: { current: createGraphLayoutFixedTimestepClock() },
    markPerformanceIdle: vi.fn(),
    recordRenderedFrame: vi.fn(),
    styleVersionRef: { current: 1 },
    synchronizedPositionVersionRef: { current: -1 },
  };
  return { layout, node, recorder, runtime };
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
    runtime.performanceAttributionRef.current.start();

    renderOwnedGraphFrame(runtime, canvasFixture(), 100);

    expect(runtime.pluginForcesRef.current.tick).toHaveBeenCalled();
    expect([layout.engine.x[0], layout.engine.y[0]]).not.toEqual([0, 0]);
    expect(node.x).toBe(layout.engine.x[0]);
    expect(renderer.render).toHaveBeenCalledOnce();
    expect(submittedFrame).toMatchObject({
      hoveredLink: null,
      positionVersion: 1,
      styleVersion: 1,
    });
    expect(runtime.propsRef.current.nodeLabelCanvasObject).toHaveBeenCalledWith(
      node,
      expect.anything(),
      1,
    );
    expect(runtime.propsRef.current.onRenderFramePost).toHaveBeenCalled();
    expect(runtime.recordRenderedFrame).toHaveBeenCalledWith(
      100,
      expect.any(Number),
      expect.any(Number),
    );
    const [, simulationMs, renderMs] = vi.mocked(runtime.recordRenderedFrame).mock.calls[0];
    expect(simulationMs).toBeGreaterThanOrEqual(0);
    expect(renderMs).toBeGreaterThan(0);
    expect(samples).toHaveLength(1);
    expect(samples[0]).toEqual(expect.objectContaining({
      gpuMs: expect.any(Number),
      overlayMs: expect.any(Number),
      physicsMs: expect.any(Number),
      syncMs: expect.any(Number),
    }));
    const attribution = runtime.performanceAttributionRef.current.stop();
    expect(attribution).toMatchObject({
      physicsHome: 'main-thread',
      renderedFrameCount: 1,
      stages: {
        canvasPrepare: { eventCount: 1 },
        frameTotalCpu: { eventCount: 1 },
        interpolatorSample: { eventCount: 0 },
        overlay: { eventCount: 1 },
        physicsStep: { eventCount: 1 },
        snapshotNodeSync: { eventCount: 1 },
      },
    });
    expect(runtime.requestFrameRef.current).toHaveBeenCalled();
  });

  it('advances multiple fixed simulation steps between slower presentations', () => {
    const renderer = { render: vi.fn() } as unknown as OwnedWebGpuRenderer;
    const { layout, recorder, runtime } = runtimeFixture(renderer);
    runtime.pluginForcesRef.current.active = () => false;
    const tick = vi.spyOn(layout.engine, 'tick').mockReturnValue({
      moving: true,
      settled: false,
      steps: 1,
    });

    renderOwnedGraphFrame(runtime, canvasFixture(), 0);
    renderOwnedGraphFrame(runtime, canvasFixture(), 1_000 / 60);

    expect(tick).toHaveBeenCalledTimes(3);
    expect(recorder.stop()?.frames.map(frame => frame.steps)).toEqual([1, 2]);
  });

  it('renders user-driven positions and continues interaction when physics reports zero steps', () => {
    let submittedFrame: OwnedWebGpuFrame | undefined;
    const renderer = {
      render: vi.fn((frame: OwnedWebGpuFrame) => { submittedFrame = frame; }),
    } as unknown as OwnedWebGpuRenderer;
    const { layout, node, recorder, runtime } = runtimeFixture(renderer);
    runtime.pluginForcesRef.current.active = () => false;
    layout.engine.setNodePosition(0, 42, 24);
    runtime.positionVersionRef.current += 1;
    runtime.pointerSessionRef.current = {
      draggedIndexes: new Set([0]),
      index: 0,
      lastWorld: { x: 42, y: 24 },
      link: null,
      moved: true,
      node,
      nodeId: node.id,
      startScreen: { x: 0, y: 0 },
    };
    vi.spyOn(layout.engine, 'tick').mockReturnValue({
      moving: false,
      settled: false,
      steps: 0,
    });

    renderOwnedGraphFrame(runtime, canvasFixture(), 100);

    expect(renderer.render).toHaveBeenCalledOnce();
    expect(submittedFrame).toMatchObject({ positionVersion: 1 });
    expect(submittedFrame?.nodes[0]).toMatchObject({ x: 42, y: 24 });
    expect(runtime.recordRenderedFrame).toHaveBeenCalledOnce();
    expect(recorder.stop()?.frames[0]?.target).toEqual({ id: 'a', x: 42, y: 24 });
    expect(runtime.requestFrameRef.current).toHaveBeenCalledOnce();
  });

  it('marks performance idle only when the simulation deliberately settles', () => {
    const renderer = { render: vi.fn() } as unknown as OwnedWebGpuRenderer;
    const { layout, runtime } = runtimeFixture(renderer);
    vi.spyOn(layout.engine, 'tick').mockReturnValue({
      moving: false,
      settled: true,
      steps: 0,
    });

    renderOwnedGraphFrame(runtime, canvasFixture(), 100);

    expect(runtime.recordRenderedFrame).toHaveBeenCalledWith(
      100,
      expect.any(Number),
      expect.any(Number),
    );
    expect(runtime.markPerformanceIdle).toHaveBeenCalledOnce();
    expect(runtime.requestFrameRef.current).not.toHaveBeenCalled();
  });

  it('does not advance frame time before layout prerequisites exist', () => {
    const renderer = { render: vi.fn() } as unknown as OwnedWebGpuRenderer;
    const { runtime } = runtimeFixture(renderer);
    runtime.layoutRef.current = null;

    renderOwnedGraphFrame(runtime, canvasFixture(), 100);
    expect(runtime.recordRenderedFrame).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled();
  });

  it('disposes a failed renderer, pauses physics, and reports the failure', () => {
    const renderer = {
      dispose: vi.fn(),
      render: vi.fn(() => { throw new Error('submission failed'); }),
    } as unknown as OwnedWebGpuRenderer;
    const { layout, runtime } = runtimeFixture(renderer);

    renderOwnedGraphFrame(runtime, canvasFixture(), 100);
    expect(runtime.recordRenderedFrame).not.toHaveBeenCalled();

    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(runtime.gpuRendererRef.current).toBeNull();
    expect(runtime.rendererOperationalRef.current).toBe(false);
    expect(runtime.onRendererError).toHaveBeenCalledWith('submission failed');
    expect(layout.engine.tick().steps).toBe(0);
    expect(runtime.requestFrameRef.current).not.toHaveBeenCalled();
  });
});
