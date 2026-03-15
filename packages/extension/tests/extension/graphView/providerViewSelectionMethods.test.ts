import { describe, expect, it, vi } from 'vitest';
import type { IViewContext } from '../../../src/core/views';
import type { IGraphData } from '../../../src/shared/types';
import { createGraphViewProviderViewSelectionMethods } from '../../../src/extension/graphView/providerViewSelectionMethods';

describe('graphView/providerViewSelectionMethods', () => {
  it('delegates view switching and focused-file updates through view selection helpers', async () => {
    const source = createSource();
    const changeView = vi.fn(async (_state, nextViewId, handlers) => {
      expect(nextViewId).toBe('codegraphy.depth-graph');
      await handlers.persistActiveViewId(nextViewId);
      handlers.applyViewTransform();
      handlers.sendAvailableViews();
      handlers.sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: { nodes: [], edges: [] } });
    });
    const setFocusedFile = vi.fn((_state, nextFilePath, handlers) => {
      expect(nextFilePath).toBe('src/app.ts');
      handlers.applyViewTransform();
      handlers.sendAvailableViews();
      handlers.sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: { nodes: [], edges: [] } });
    });
    const methods = createGraphViewProviderViewSelectionMethods(
      source as never,
      createDependencies({
        changeView,
        setFocusedFile,
      }),
    );

    await methods.changeView('codegraphy.depth-graph');
    methods.setFocusedFile('src/app.ts');

    expect(changeView).toHaveBeenCalledOnce();
    expect(setFocusedFile).toHaveBeenCalledOnce();
    expect(source._context.workspaceState.update).toHaveBeenCalledWith(
      'codegraphy.selectedView',
      'codegraphy.depth-graph',
    );
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
  });

  it('delegates depth-limit changes and reads back the current limit', async () => {
    const source = createSource();
    const setDepthLimit = vi.fn(async (_state, nextDepthLimit, handlers) => {
      expect(nextDepthLimit).toBe(7);
      await handlers.persistDepthLimit(nextDepthLimit);
      handlers.applyViewTransform();
      handlers.sendMessage({
        type: 'DEPTH_LIMIT_UPDATED',
        payload: { depthLimit: nextDepthLimit },
      });
    });
    const getDepthLimit = vi.fn(() => 7);
    const methods = createGraphViewProviderViewSelectionMethods(
      source as never,
      createDependencies({
        setDepthLimit,
        getDepthLimit,
      }),
    );

    await methods.setDepthLimit(7);

    expect(setDepthLimit).toHaveBeenCalledOnce();
    expect(source._context.workspaceState.update).toHaveBeenCalledWith(
      'codegraphy.depthLimit',
      7,
    );
    expect(methods.getDepthLimit()).toBe(7);
    expect(getDepthLimit).toHaveBeenCalledWith(source._viewContext, 1);
  });
});

function createSource() {
  return {
    _context: {
      workspaceState: {
        update: vi.fn(() => Promise.resolve()),
      },
    },
    _viewRegistry: {
      get: vi.fn(() => ({ view: { id: 'codegraphy.connections' } })),
      isViewAvailable: vi.fn(() => true),
    },
    _viewContext: {
      activePlugins: new Set<string>(),
      depthLimit: 1,
    } satisfies IViewContext,
    _activeViewId: 'codegraphy.connections',
    _applyViewTransform: vi.fn(),
    _sendAvailableViews: vi.fn(),
    _sendMessage: vi.fn(),
    _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
  };
}

function createDependencies(
  overrides: Partial<Parameters<typeof createGraphViewProviderViewSelectionMethods>[1]> = {},
) {
  return {
    changeView: vi.fn(async () => undefined),
    setFocusedFile: vi.fn(),
    setDepthLimit: vi.fn(async () => undefined),
    getDepthLimit: vi.fn((viewContext: IViewContext, defaultDepthLimit: number) =>
      viewContext.depthLimit ?? defaultDepthLimit,
    ),
    defaultDepthLimit: 1,
    selectedViewKey: 'codegraphy.selectedView',
    depthLimitKey: 'codegraphy.depthLimit',
    logUnavailableView: vi.fn(),
    ...overrides,
  };
}
