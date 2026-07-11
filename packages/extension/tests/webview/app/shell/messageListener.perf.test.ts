import { describe, expect, it, vi } from 'vitest';

import type {
  PerfControlMessage,
  PerfRenderReadyRequestMessage,
} from '../../../../src/shared/perf/protocol';
import { createMessageHandler, type InjectAssetsParams } from '../../../../src/webview/app/shell/messageListener';
import type { WebviewPluginHost } from '../../../../src/webview/pluginHost/manager';
import { graphStore } from '../../../../src/webview/store/state';

describe('app message listener performance controls', () => {
  it('routes a render-ready request without forwarding it to the graph store', () => {
    const handleExtensionMessage = vi.fn();
    vi.spyOn(graphStore, 'getState').mockReturnValue({
      handleExtensionMessage,
    } as unknown as ReturnType<typeof graphStore.getState>);
    const perfBridge = {
      handleControl: vi.fn(() => false),
      handleExtensionMessage: vi.fn(() => false),
    };
    const renderReadyControl = {
      graphDataReceived: vi.fn(),
      handleRequest: vi.fn(() => true),
    };
    const handler = createMessageHandler(
      vi.fn<(_params: InjectAssetsParams) => Promise<void>>().mockResolvedValue(),
      { deliverMessage: vi.fn() } as unknown as WebviewPluginHost,
      undefined,
      undefined,
      perfBridge,
      renderReadyControl,
    );
    const message: PerfRenderReadyRequestMessage = {
      type: 'PERF_RENDER_READY_REQUEST',
      payload: { graphRevision: 1, requestId: 'render-request-1' },
    };

    handler({ data: message } as MessageEvent<unknown>);

    expect(renderReadyControl.handleRequest).toHaveBeenCalledWith(message);
    expect(handleExtensionMessage).not.toHaveBeenCalled();
  });

  it('records a graph payload generation before forwarding it to the store', () => {
    const callOrder: string[] = [];
    const handleExtensionMessage = vi.fn(() => { callOrder.push('store'); });
    vi.spyOn(graphStore, 'getState').mockReturnValue({
      handleExtensionMessage,
    } as unknown as ReturnType<typeof graphStore.getState>);
    const perfBridge = {
      handleControl: vi.fn(() => false),
      handleExtensionMessage: vi.fn(() => false),
    };
    const renderReadyControl = {
      graphDataReceived: vi.fn(() => { callOrder.push('render-ready'); }),
      handleRequest: vi.fn(() => false),
    };
    const handler = createMessageHandler(
      vi.fn<(_params: InjectAssetsParams) => Promise<void>>().mockResolvedValue(),
      { deliverMessage: vi.fn() } as unknown as WebviewPluginHost,
      undefined,
      undefined,
      perfBridge,
      renderReadyControl,
    );
    const message = {
      type: 'GRAPH_DATA_UPDATED' as const,
      graphRevision: 17,
      payload: { nodes: [], edges: [] },
    };

    handler({ data: message } as MessageEvent<unknown>);

    expect(callOrder).toEqual(['render-ready', 'store']);
    expect(renderReadyControl.graphDataReceived).toHaveBeenCalledWith(17);
  });

  it('records a patched graph generation before forwarding it to the store', () => {
    const callOrder: string[] = [];
    vi.spyOn(graphStore, 'getState').mockReturnValue({
      handleExtensionMessage: vi.fn(() => { callOrder.push('store'); }),
    } as unknown as ReturnType<typeof graphStore.getState>);
    const renderReadyControl = {
      graphDataReceived: vi.fn(() => { callOrder.push('render-ready'); }),
      handleRequest: vi.fn(() => false),
    };
    const handler = createMessageHandler(
      vi.fn<(_params: InjectAssetsParams) => Promise<void>>().mockResolvedValue(),
      { deliverMessage: vi.fn() } as unknown as WebviewPluginHost,
      undefined,
      undefined,
      { handleControl: vi.fn(() => false), handleExtensionMessage: vi.fn(() => false) },
      renderReadyControl,
    );

    handler({
      data: {
        type: 'GRAPH_DATA_PATCHED',
        baseGraphRevision: 17,
        graphRevision: 18,
        nodeCount: 1,
        edgeCount: 0,
        payload: {
          addedNodes: [],
          removedNodeIds: [],
          updatedNodes: [],
          addedLinks: [],
          removedLinkIds: [],
        },
      },
    } as MessageEvent<unknown>);

    expect(callOrder).toEqual(['render-ready', 'store']);
    expect(renderReadyControl.graphDataReceived).toHaveBeenCalledWith(18);
  });

  it('handles a performance control through the existing message listener', () => {
    const handleExtensionMessage = vi.fn();
    vi.spyOn(graphStore, 'getState').mockReturnValue({
      handleExtensionMessage,
    } as unknown as ReturnType<typeof graphStore.getState>);
    const perfBridge = {
      handleControl: vi.fn(() => true),
      handleExtensionMessage: vi.fn(() => true),
    };
    const handler = createMessageHandler(
      vi.fn<(_params: InjectAssetsParams) => Promise<void>>().mockResolvedValue(),
      { deliverMessage: vi.fn() } as unknown as WebviewPluginHost,
      undefined,
      undefined,
      perfBridge,
    );
    const message: PerfControlMessage = {
      type: 'PERF_CONTROL',
      payload: {
        kind: 'arm-graph',
        operation: {
          dimension: 'medium',
          operationId: 'operation-1',
          runId: 'run-1',
          scenario: 'single-save',
        },
      },
    };

    handler({ data: message } as MessageEvent<unknown>);

    expect(perfBridge.handleControl).toHaveBeenCalledWith(message);
    expect(handleExtensionMessage).not.toHaveBeenCalled();
  });

  it('does not consult the performance bridge for ordinary extension messages', () => {
    const handleExtensionMessage = vi.fn();
    vi.spyOn(graphStore, 'getState').mockReturnValue({
      handleExtensionMessage,
    } as unknown as ReturnType<typeof graphStore.getState>);
    const perfBridge = {
      handleControl: vi.fn(() => false),
      handleExtensionMessage: vi.fn(() => true),
    };
    const handler = createMessageHandler(
      vi.fn<(_params: InjectAssetsParams) => Promise<void>>().mockResolvedValue(),
      { deliverMessage: vi.fn() } as unknown as WebviewPluginHost,
      undefined,
      undefined,
      perfBridge,
    );
    const message = { type: 'CACHE_INVALIDATED' as const };

    handler({ data: message } as MessageEvent<unknown>);

    expect(perfBridge.handleControl).not.toHaveBeenCalled();
    expect(handleExtensionMessage).toHaveBeenCalledWith(message);
  });

  it('observes graph control echoes after the store applies them', () => {
    const callOrder: string[] = [];
    const handleExtensionMessage = vi.fn(() => { callOrder.push('store'); });
    vi.spyOn(graphStore, 'getState').mockReturnValue({
      handleExtensionMessage,
    } as unknown as ReturnType<typeof graphStore.getState>);
    const perfBridge = {
      handleControl: vi.fn(() => false),
      handleExtensionMessage: vi.fn(() => {
        callOrder.push('perf');
        return true;
      }),
    };
    const handler = createMessageHandler(
      vi.fn<(_params: InjectAssetsParams) => Promise<void>>().mockResolvedValue(),
      { deliverMessage: vi.fn() } as unknown as WebviewPluginHost,
      undefined,
      undefined,
      perfBridge,
    );
    const message = {
      type: 'GRAPH_CONTROLS_UPDATED' as const,
      payload: {
        nodeTypes: [],
        edgeTypes: [],
        nodeColors: {},
        nodeVisibility: {},
        edgeVisibility: {},
      },
    };

    handler({ data: message } as MessageEvent<unknown>);

    expect(callOrder).toEqual(['store', 'perf']);
    expect(perfBridge.handleExtensionMessage).toHaveBeenCalledWith(message);
  });
});
