import { describe, expect, it, vi } from 'vitest';

import { createWebviewRenderReadyControl } from '../../../../src/webview/perf/renderReady/control';

describe('webview/perf/renderReady/control', () => {
  it('responds to a pending request after the stopped graph renders a frame', () => {
    const postMessage = vi.fn();
    const control = createWebviewRenderReadyControl({ postMessage });

    expect(control.handleRequest({
      type: 'PERF_RENDER_READY_REQUEST',
      payload: { requestId: 'render-request-1' },
    })).toBe(true);
    expect(postMessage).not.toHaveBeenCalled();

    control.engineStopped();
    expect(postMessage).not.toHaveBeenCalled();

    control.renderFramePost({ nodeCount: 100, edgeCount: 75 });

    expect(postMessage).toHaveBeenCalledWith({
      type: 'PERF_RENDER_READY',
      payload: {
        graphRevision: 0,
        requestId: 'render-request-1',
        nodeCount: 100,
        edgeCount: 75,
      },
    });
  });

  it('reuses a valid post-stop frame for a later request', () => {
    const postMessage = vi.fn();
    const control = createWebviewRenderReadyControl({ postMessage });

    control.engineStopped();
    control.renderFramePost({ nodeCount: 101, edgeCount: 76 });
    expect(postMessage).not.toHaveBeenCalled();

    control.handleRequest({
      type: 'PERF_RENDER_READY_REQUEST',
      payload: { requestId: 'render-request-2' },
    });

    expect(postMessage).toHaveBeenCalledWith({
      type: 'PERF_RENDER_READY',
      payload: {
        graphRevision: 0,
        requestId: 'render-request-2',
        nodeCount: 101,
        edgeCount: 76,
      },
    });
  });

  it('does not reuse a frame from before the latest graph payload arrived', () => {
    const postMessage = vi.fn();
    const control = createWebviewRenderReadyControl({ postMessage });

    control.engineStopped();
    control.renderFramePost({ nodeCount: 5_000, edgeCount: 9_996 });
    control.graphDataReceived(41);
    control.handleRequest({
      type: 'PERF_RENDER_READY_REQUEST',
      payload: { graphRevision: 41, requestId: 'indexed-render' },
    });

    expect(postMessage).not.toHaveBeenCalled();

    control.graphChanged(false);
    control.renderFramePost({ nodeCount: 90_000, edgeCount: 9_996 });

    expect(postMessage).toHaveBeenCalledWith({
      type: 'PERF_RENDER_READY',
      payload: {
        graphRevision: 41,
        requestId: 'indexed-render',
        nodeCount: 90_000,
        edgeCount: 9_996,
      },
    });
  });

  it('waits when a correlated request arrives before its graph payload', () => {
    const postMessage = vi.fn();
    const control = createWebviewRenderReadyControl({ postMessage });

    control.graphDataReceived(50);
    control.graphChanged(false);
    control.renderFramePost({ nodeCount: 5_000, edgeCount: 9_996 });
    control.handleRequest({
      type: 'PERF_RENDER_READY_REQUEST',
      payload: { graphRevision: 51, requestId: 'racing-render' },
    });

    expect(postMessage).not.toHaveBeenCalled();

    control.graphDataReceived(51);
    control.graphChanged(false);
    control.renderFramePost({ nodeCount: 90_000, edgeCount: 9_996 });

    expect(postMessage).toHaveBeenCalledWith({
      type: 'PERF_RENDER_READY',
      payload: {
        graphRevision: 51,
        requestId: 'racing-render',
        nodeCount: 90_000,
        edgeCount: 9_996,
      },
    });
  });

  it('reuses the painted frame when the request follows its graph payload', () => {
    const postMessage = vi.fn();
    const control = createWebviewRenderReadyControl({ postMessage });

    control.graphDataReceived(42);
    control.graphChanged(false);
    control.renderFramePost({ nodeCount: 90_000, edgeCount: 9_996 });
    control.handleRequest({
      type: 'PERF_RENDER_READY_REQUEST',
      payload: { graphRevision: 42, requestId: 'painted-indexed-render' },
    });

    expect(postMessage).toHaveBeenCalledWith({
      type: 'PERF_RENDER_READY',
      payload: {
        graphRevision: 42,
        requestId: 'painted-indexed-render',
        nodeCount: 90_000,
        edgeCount: 9_996,
      },
    });
  });

  it('invalidates stopped-frame evidence when the engine ticks', () => {
    const postMessage = vi.fn();
    const control = createWebviewRenderReadyControl({ postMessage });

    control.engineStopped();
    control.renderFramePost({ nodeCount: 100, edgeCount: 75 });
    control.engineTick();
    control.handleRequest({
      type: 'PERF_RENDER_READY_REQUEST',
      payload: { requestId: 'render-request-3' },
    });
    expect(postMessage).not.toHaveBeenCalled();

    control.engineStopped();
    control.renderFramePost({ nodeCount: 102, edgeCount: 77 });

    expect(postMessage).toHaveBeenCalledWith({
      type: 'PERF_RENDER_READY',
      payload: {
        graphRevision: 0,
        requestId: 'render-request-3',
        nodeCount: 102,
        edgeCount: 77,
      },
    });
  });

  it('invalidates stopped-frame evidence when the graph changes', () => {
    const postMessage = vi.fn();
    const control = createWebviewRenderReadyControl({ postMessage });

    control.engineStopped();
    control.renderFramePost({ nodeCount: 100, edgeCount: 75 });
    control.graphChanged(true);
    control.handleRequest({
      type: 'PERF_RENDER_READY_REQUEST',
      payload: { requestId: 'render-request-4' },
    });

    expect(postMessage).not.toHaveBeenCalled();
  });

  it('treats a deliberately skipped simulation as stopped after its first frame', () => {
    const postMessage = vi.fn();
    const control = createWebviewRenderReadyControl({ postMessage });

    control.graphChanged(false);
    control.handleRequest({
      type: 'PERF_RENDER_READY_REQUEST',
      payload: { requestId: 'render-request-no-simulation' },
    });
    expect(postMessage).not.toHaveBeenCalled();

    control.renderFramePost({ nodeCount: 540_000, edgeCount: 569_996 });

    expect(postMessage).toHaveBeenCalledWith({
      type: 'PERF_RENDER_READY',
      payload: {
        graphRevision: 0,
        requestId: 'render-request-no-simulation',
        nodeCount: 540_000,
        edgeCount: 569_996,
      },
    });
  });

  it('responds only to the latest pending request', () => {
    const postMessage = vi.fn();
    const control = createWebviewRenderReadyControl({ postMessage });

    control.handleRequest({
      type: 'PERF_RENDER_READY_REQUEST',
      payload: { requestId: 'superseded-request' },
    });
    control.handleRequest({
      type: 'PERF_RENDER_READY_REQUEST',
      payload: { requestId: 'current-request' },
    });
    control.engineStopped();
    control.renderFramePost({ nodeCount: 100, edgeCount: 75 });

    expect(postMessage).toHaveBeenCalledOnce();
    expect(postMessage).toHaveBeenCalledWith({
      type: 'PERF_RENDER_READY',
      payload: {
        graphRevision: 0,
        requestId: 'current-request',
        nodeCount: 100,
        edgeCount: 75,
      },
    });
  });

  it('uses the final painted frame when the engine stops without another frame', () => {
    const postMessage = vi.fn();
    const control = createWebviewRenderReadyControl({ postMessage });

    control.graphDataReceived(41);
    control.graphChanged(true);
    control.renderFramePost({ nodeCount: 5_000, edgeCount: 9_996 });
    control.handleRequest({
      type: 'PERF_RENDER_READY_REQUEST',
      payload: { graphRevision: 41, requestId: 'render-request-5' },
    });
    expect(postMessage).not.toHaveBeenCalled();

    control.engineStopped();

    expect(postMessage).toHaveBeenCalledWith({
      type: 'PERF_RENDER_READY',
      payload: {
        graphRevision: 41,
        requestId: 'render-request-5',
        nodeCount: 5_000,
        edgeCount: 9_996,
      },
    });
  });

  it('rejects an extended render-ready request', () => {
    const postMessage = vi.fn();
    const control = createWebviewRenderReadyControl({ postMessage });

    expect(control.handleRequest({
      type: 'PERF_RENDER_READY_REQUEST',
      payload: { requestId: 'render-request-6', unexpected: true },
    })).toBe(false);
    control.engineStopped();
    control.renderFramePost({ nodeCount: 100, edgeCount: 75 });

    expect(postMessage).not.toHaveBeenCalled();
  });
});
