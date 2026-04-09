import { describe, expect, it, vi } from 'vitest';
import type { IViewContext } from '../../../../../src/core/views/contracts';
import type { IGraphData } from '../../../../../src/shared/graph/types';
import { createGraphViewProviderViewSelectionMethods } from '../../../../../src/extension/graphView/provider/view/selection';

describe('graphView/provider/view/selection', () => {
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
    const dependencies = createDependencies({
      changeView,
      setFocusedFile,
    });
    const methods = createGraphViewProviderViewSelectionMethods(
      source as never,
      dependencies,
    );

    await methods.changeView('codegraphy.depth-graph');
    methods.setFocusedFile('src/app.ts');

    expect(changeView).toHaveBeenCalledOnce();
    expect(setFocusedFile).toHaveBeenCalledOnce();
    expect(dependencies.getConfiguration().update).not.toHaveBeenCalledWith(
      expect.stringMatching(/selectedView/),
      expect.anything(),
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
    const dependencies = createDependencies({
      setDepthLimit,
      getDepthLimit,
    });
    const methods = createGraphViewProviderViewSelectionMethods(
      source as never,
      dependencies,
    );

    await methods.setDepthLimit(7);

    expect(setDepthLimit).toHaveBeenCalledOnce();
    expect(dependencies.getConfiguration().update).toHaveBeenCalledWith(
      'depthLimit',
      7,
    );
    expect(methods.getDepthLimit()).toBe(7);
    expect(getDepthLimit).toHaveBeenCalledWith(source._viewContext, 1);
  });

  it('forwards view-availability checks and tolerates missing transform broadcasters', async () => {
    const source = createSource({
      _applyViewTransform: undefined,
      _sendAvailableViews: undefined,
    });
    const logUnavailableView = vi.fn();
    const changeView = vi.fn(async (_state, nextViewId, handlers) => {
      expect(handlers.isViewAvailable(nextViewId, source._viewContext)).toBe(true);
      handlers.applyViewTransform();
      handlers.sendAvailableViews();
      handlers.logUnavailableView('codegraphy.missing');
      handlers.sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: { nodes: [], edges: [] } });
    });
    const methods = createGraphViewProviderViewSelectionMethods(
      source as never,
      createDependencies({
        changeView,
        logUnavailableView,
      }),
    );

    await methods.changeView('codegraphy.depth-graph');

    expect(source._viewRegistry.isViewAvailable).toHaveBeenCalledWith(
      'codegraphy.depth-graph',
      source._viewContext,
    );
    expect(logUnavailableView).toHaveBeenCalledWith('codegraphy.missing');
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
  });

  it('forwards active view lookups through focused-file and depth-limit handlers', async () => {
    const source = createSource({
      _applyViewTransform: undefined,
      _sendAvailableViews: undefined,
    });
    const viewInfo = { view: { id: 'codegraphy.connections' } };
    source._viewRegistry.get = vi.fn(() => viewInfo);
    const setFocusedFile = vi.fn((_state, nextFilePath, handlers) => {
      expect(nextFilePath).toBeUndefined();
      expect(handlers.getActiveViewInfo('codegraphy.connections')).toBe(viewInfo);
      handlers.applyViewTransform();
      handlers.sendAvailableViews();
      handlers.sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: { nodes: [], edges: [] } });
    });
    const setDepthLimit = vi.fn(async (_state, nextDepthLimit, handlers) => {
      expect(nextDepthLimit).toBe(4);
      expect(handlers.getActiveViewInfo('codegraphy.connections')).toBe(viewInfo);
      handlers.applyViewTransform();
      await handlers.persistDepthLimit(nextDepthLimit);
      handlers.sendMessage({
        type: 'DEPTH_LIMIT_UPDATED',
        payload: { depthLimit: nextDepthLimit },
        });
    });
    const dependencies = createDependencies({
      setFocusedFile,
      setDepthLimit,
    });
    const methods = createGraphViewProviderViewSelectionMethods(
      source as never,
      dependencies,
    );

    methods.setFocusedFile(undefined);
    await methods.setDepthLimit(4);

    expect(source._viewRegistry.get).toHaveBeenCalledWith('codegraphy.connections');
    expect(dependencies.getConfiguration().update).toHaveBeenCalledWith(
      'depthLimit',
      4,
    );
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'DEPTH_LIMIT_UPDATED',
      payload: { depthLimit: 4 },
    });
  });
});

function createSource(overrides: Partial<Record<string, unknown>> = {}) {
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
    ...overrides,
  };
}

function createDependencies(
  overrides: Partial<Parameters<typeof createGraphViewProviderViewSelectionMethods>[1]> = {},
) {
  const configuration = {
    update: vi.fn(() => Promise.resolve()),
  };
  return {
    changeView: vi.fn(async () => undefined),
    setFocusedFile: vi.fn(),
    setDepthLimit: vi.fn(async () => undefined),
    getDepthLimit: vi.fn((viewContext: IViewContext, defaultDepthLimit: number) =>
      viewContext.depthLimit ?? defaultDepthLimit,
    ),
    getConfiguration: vi.fn(() => configuration),
    defaultDepthLimit: 1,
    depthLimitKey: 'depthLimit',
    logUnavailableView: vi.fn(),
    ...overrides,
  };
}
