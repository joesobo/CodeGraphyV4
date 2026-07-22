import type {
  WebGpuGraphFrame as OwnedWebGpuFrame,
  WebGpuGraphRenderer as OwnedWebGpuRenderer,
  WebGpuGraphSecondaryFrame as OwnedWebGpuSecondaryFrame,
} from '@codegraphy-dev/graph-renderer';
import { describe, expect, it, vi } from 'vitest';
import { renderOwnedGraphFrame } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/runtime/render';
import { canvasFixture, runtimeFixture } from './fixture';

describe('owned graph frame execution', () => {
  it('runs frame phases in order and updates the FPS monitor', () => {
    let submittedFrame: OwnedWebGpuFrame | undefined;
    const renderer = {
      render: vi.fn((frame: OwnedWebGpuFrame) => {
        submittedFrame = frame;
        frame.getNodeStyle(frame.nodes[0]);
        return 41;
      }),
    } as unknown as OwnedWebGpuRenderer;
    const { layout, node, runtime } = runtimeFixture(renderer);

    renderOwnedGraphFrame(runtime, canvasFixture(), 100);

    expect(runtime.pluginForcesRef.current.tick).toHaveBeenCalled();
    expect([layout.engine.x[0], layout.engine.y[0]]).not.toEqual([0, 0]);
    expect(node.x).toBe(layout.engine.x[0]);
    expect(renderer.render).toHaveBeenCalledOnce();
    expect(submittedFrame).toMatchObject({
      hoveredLink: null,
      positionVersion: 2,
      styleVersion: 1,
    });
    expect(runtime.propsRef.current.nodeLabelCanvasObject).toHaveBeenCalledWith(
      node,
      expect.anything(),
      1,
    );
    expect(runtime.propsRef.current.onRenderFramePost).toHaveBeenCalled();
    expect(runtime.recordRenderedFrame).toHaveBeenCalledWith(
      41,
      100,
      expect.any(Number),
      expect.any(Number),
    );
    const [, , simulationMs, renderMs] = vi.mocked(runtime.recordRenderedFrame).mock.calls[0];
    expect(simulationMs).toBeGreaterThanOrEqual(0);
    expect(renderMs).toBeGreaterThan(0);
    expect(runtime.requestFrameRef.current).toHaveBeenCalled();
  });

  it('keeps settled world-space layout unchanged when the camera zoom changes', () => {
    const renderer = { render: vi.fn(() => 1) } as unknown as OwnedWebGpuRenderer;
    const { layout, runtime } = runtimeFixture(renderer);
    runtime.pluginForcesRef.current.active = () => false;
    while (!layout.engine.settled) layout.engine.tick();
    runtime.synchronizedPositionVersionRef.current = runtime.positionVersionRef.current;
    runtime.engineStopNotifiedRef.current = true;
    const settledX = [...layout.engine.x];
    const settledY = [...layout.engine.y];

    runtime.cameraRef.current.zoom = 0.005;
    renderOwnedGraphFrame(runtime, canvasFixture(), 0);
    runtime.cameraRef.current.zoom = 4;
    renderOwnedGraphFrame(runtime, canvasFixture(), 1_000 / 60);

    expect([...layout.engine.x]).toEqual(settledX);
    expect([...layout.engine.y]).toEqual(settledY);
    expect(layout.engine.settled).toBe(true);
    expect(runtime.engineStopNotifiedRef.current).toBe(true);
  });

  it('advances multiple fixed simulation steps between slower presentations', () => {
    const renderer = { render: vi.fn(() => 1) } as unknown as OwnedWebGpuRenderer;
    const { layout, runtime } = runtimeFixture(renderer);
    runtime.pluginForcesRef.current.active = () => false;
    const tick = vi.spyOn(layout.engine, 'tick').mockReturnValue({
      moving: true,
      settled: false,
      steps: 1,
    });

    renderOwnedGraphFrame(runtime, canvasFixture(), 0);
    renderOwnedGraphFrame(runtime, canvasFixture(), 1_000 / 60);

    expect(tick).toHaveBeenCalledTimes(3);
  });

  it('renders user-driven positions and continues interaction when physics reports zero steps', () => {
    let submittedFrame: OwnedWebGpuFrame | undefined;
    const renderer = {
      render: vi.fn((frame: OwnedWebGpuFrame) => { submittedFrame = frame; return 1; }),
    } as unknown as OwnedWebGpuRenderer;
    const { layout, node, runtime } = runtimeFixture(renderer);
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
    expect(runtime.requestFrameRef.current).toHaveBeenCalledOnce();
  });

  it('repaints a manually moved node without changing the settled minimap fit', () => {
    const secondaryFrames: Array<{ camera: { centerX: number; centerY: number; zoom: number } }> = [];
    const renderer = {
      render: vi.fn((_frame: OwnedWebGpuFrame, secondaryFrame?: OwnedWebGpuSecondaryFrame) => {
        if (secondaryFrame) secondaryFrames.push(secondaryFrame);
        return secondaryFrames.length;
      }),
    } as unknown as OwnedWebGpuRenderer;
    const { layout, node, runtime } = runtimeFixture(renderer);
    runtime.minimapSurfaceRegisteredRef.current = true;
    runtime.minimapPanelRef.current = {
      getBoundingClientRect: () => ({ height: 160, width: 160 }),
    } as HTMLDivElement;
    runtime.pluginForcesRef.current.active = () => false;
    while (!layout.engine.settled) layout.engine.tick();

    renderOwnedGraphFrame(runtime, canvasFixture(), 0);
    const settledCamera = { ...secondaryFrames[0].camera };
    layout.engine.setNodePosition(0, 10_000, -10_000);
    node.x = 10_000;
    node.y = -10_000;
    runtime.positionVersionRef.current += 1;

    renderOwnedGraphFrame(runtime, canvasFixture(), 125);

    expect(secondaryFrames).toHaveLength(2);
    expect(secondaryFrames[1].camera).toEqual(settledCamera);
    expect(secondaryFrames[1].camera.zoom).toBeGreaterThan(1);
  });

  it('does not run plugin forces when no fixed simulation step is due', () => {
    let submittedFrame: OwnedWebGpuFrame | undefined;
    const renderer = {
      render: vi.fn((frame: OwnedWebGpuFrame) => { submittedFrame = frame; return 1; }),
    } as unknown as OwnedWebGpuRenderer;
    const { layout, runtime } = runtimeFixture(renderer);
    runtime.simulationClockRef.current.lastFrameTimestampMs = 100;
    runtime.synchronizedPositionVersionRef.current = runtime.positionVersionRef.current;
    const tick = vi.spyOn(layout.engine, 'tick');

    renderOwnedGraphFrame(runtime, canvasFixture(), 100);

    expect(tick).not.toHaveBeenCalled();
    expect(runtime.pluginForcesRef.current.tick).not.toHaveBeenCalled();
    expect(submittedFrame?.positionVersion).toBe(0);
    expect(submittedFrame?.nodeX[0]).toBe(0);
    expect(submittedFrame?.nodeY[0]).toBe(0);
  });

  it('records submitted work and continues scheduling when a post-frame decoration throws', () => {
    const renderer = { render: vi.fn(() => 23) } as unknown as OwnedWebGpuRenderer;
    const { runtime } = runtimeFixture(renderer);
    runtime.propsRef.current.onRenderFramePost = vi.fn(() => {
      throw new Error('plugin overlay failed');
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderOwnedGraphFrame(runtime, canvasFixture(), 100);

    expect(runtime.recordRenderedFrame).toHaveBeenCalledWith(
      23,
      100,
      expect.any(Number),
      expect.any(Number),
    );
    expect(runtime.requestFrameRef.current).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      '[CodeGraphy] Graph post-frame decoration failed:',
      expect.any(Error),
    );
  });

  it('allows active no-op plugin forces to remain settled', () => {
    const renderer = { render: vi.fn(() => 1) } as unknown as OwnedWebGpuRenderer;
    const { layout, runtime } = runtimeFixture(renderer);
    runtime.pluginForcesRef.current.tick = vi.fn();
    while (!layout.engine.settled) layout.engine.tick();
    runtime.simulationClockRef.current.lastFrameTimestampMs = 100;
    const setKinematics = vi.spyOn(layout.engine, 'setKinematics');

    renderOwnedGraphFrame(runtime, canvasFixture(), 100);

    expect(setKinematics).not.toHaveBeenCalled();
    expect(runtime.requestFrameRef.current).not.toHaveBeenCalled();
    expect(runtime.markPerformanceIdle).toHaveBeenCalledOnce();
  });

});
