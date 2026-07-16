import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createGraphData,
  createGraphState,
  getShellHarness,
  latestFrameCallback,
  readGraphViewportScale,
  renderGraphViewportShell,
  resetShellHarness,
} from './shellFixture';

const shellHarness = getShellHarness();

describe('graph/viewport/shell frame projection', () => {
  beforeEach(resetShellHarness);

  it('publishes 2d graph viewport scale changes from render frames', () => {
    renderGraphViewportShell();

    act(() => latestFrameCallback()({} as CanvasRenderingContext2D, 2));
    expect(readGraphViewportScale()).toBe(2);

    act(() => latestFrameCallback()({} as CanvasRenderingContext2D, 2.005));
    expect(readGraphViewportScale()).toBe(2);
  });

  it('does not rerender the viewport for every moving graph frame', () => {
    const graphData = createGraphData();
    graphData.nodes[0] = { ...graphData.nodes[0], x: 10, y: 20 };
    graphData.nodes[1] = { ...graphData.nodes[1], x: 30, y: 40 };
    const graphState = createGraphState(graphData);
    let frameOffset = 0;
    const graph2ScreenCoords = vi.fn((x: number, y: number) => ({
      x: x + frameOffset,
      y: y + frameOffset,
    }));
    graphState.renderer.fg2dRef.current = {
      graph2ScreenCoords,
      screen2GraphCoords: (x: number, y: number) => ({
        x: x - frameOffset,
        y: y - frameOffset,
      }),
      zoom: () => 1,
    } as never;

    renderGraphViewportShell({ graphState });
    act(() => {
      frameOffset = 1;
      latestFrameCallback()({} as CanvasRenderingContext2D, 1);
    });

    const renderCountAfterAccessibilityPublish = shellHarness.viewport.mock.calls.length;
    const projectedNodesAfterAccessibilityPublish = graph2ScreenCoords.mock.calls.length;

    for (frameOffset = 2; frameOffset <= 12; frameOffset += 1) {
      act(() => latestFrameCallback()({} as CanvasRenderingContext2D, 1));
    }

    expect(renderCountAfterAccessibilityPublish).toBeGreaterThan(1);
    expect(shellHarness.viewport.mock.calls.length).toBe(renderCountAfterAccessibilityPublish);
    expect(graph2ScreenCoords.mock.calls.length).toBe(projectedNodesAfterAccessibilityPublish);
  });

  it('waits for graph coordinates before projecting accessibility nodes', () => {
    const graphState = createGraphState(createGraphData());
    const graph2ScreenCoords = vi.fn((x: number, y: number) => ({ x, y }));
    graphState.renderer.fg2dRef.current = {
      graph2ScreenCoords,
      screen2GraphCoords: (x: number, y: number) => ({ x, y }),
      zoom: () => 1,
    } as never;

    renderGraphViewportShell({ graphState });
    act(() => latestFrameCallback()({} as CanvasRenderingContext2D, 1));
    expect(graph2ScreenCoords).not.toHaveBeenCalled();

    graphState.renderer.graphDataRef.current.nodes[0] = {
      ...graphState.renderer.graphDataRef.current.nodes[0],
      x: 10,
      y: 20,
    };
    graphState.renderer.graphDataRef.current.nodes[1] = {
      ...graphState.renderer.graphDataRef.current.nodes[1],
      x: 30,
      y: 40,
    };

    act(() => latestFrameCallback()({} as CanvasRenderingContext2D, 1));
    expect(graph2ScreenCoords).toHaveBeenCalledTimes(2);
  });
});
