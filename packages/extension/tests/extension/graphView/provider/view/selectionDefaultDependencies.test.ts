import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IViewContext } from '../../../../../src/core/views/contracts';
import type { IGraphData } from '../../../../../src/shared/graph/types';

const mocks = vi.hoisted(() => ({
  changeGraphViewView: vi.fn(),
  setGraphViewFocusedFile: vi.fn(),
  setGraphViewDepthLimit: vi.fn(),
  getGraphViewDepthLimit: vi.fn(),
}));

vi.mock('../../../../../src/extension/graphView/view/selection', () => ({
  changeGraphViewView: mocks.changeGraphViewView,
  setGraphViewFocusedFile: mocks.setGraphViewFocusedFile,
  setGraphViewDepthLimit: mocks.setGraphViewDepthLimit,
  getGraphViewDepthLimit: mocks.getGraphViewDepthLimit,
}));

import { createGraphViewProviderViewSelectionMethods } from '../../../../../src/extension/graphView/provider/view/selection';

describe('graphView/provider/view/selection default dependencies', () => {
  beforeEach(() => {
    mocks.changeGraphViewView.mockReset();
    mocks.setGraphViewFocusedFile.mockReset();
    mocks.setGraphViewDepthLimit.mockReset();
    mocks.getGraphViewDepthLimit.mockReset();
  });

  it('uses the default view switching delegates and persisted view key', async () => {
    const source = createSource();
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    mocks.changeGraphViewView.mockImplementation(async (_state, nextViewId, handlers) => {
      expect(handlers.isViewAvailable(nextViewId, source._viewContext)).toBe(true);
      await handlers.persistActiveViewId(nextViewId);
      handlers.applyViewTransform();
      handlers.sendAvailableViews();
      handlers.sendMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: { nodes: [], edges: [] },
      });
      handlers.logUnavailableView('codegraphy.missing');
    });

    const methods = createGraphViewProviderViewSelectionMethods(source as never);
    await methods.changeView('codegraphy.depth-graph');

    expect(mocks.changeGraphViewView).toHaveBeenCalledOnce();
    expect(source._viewRegistry.isViewAvailable).toHaveBeenCalledWith(
      'codegraphy.depth-graph',
      source._viewContext,
    );
    expect(source._context.workspaceState.update).toHaveBeenCalledWith(
      'codegraphy.selectedView',
      'codegraphy.depth-graph',
    );
    expect(source._applyViewTransform).toHaveBeenCalledOnce();
    expect(source._sendAvailableViews).toHaveBeenCalledOnce();
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
    expect(consoleWarn).toHaveBeenCalledWith("[CodeGraphy] View 'codegraphy.missing' is not available");

    consoleWarn.mockRestore();
  });

  it('uses the default focused-file, depth-limit, and readback delegates', async () => {
    const source = createSource();

    mocks.setGraphViewFocusedFile.mockImplementation((_state, nextFilePath, handlers) => {
      expect(nextFilePath).toBe('src/index.ts');
      expect(handlers.getActiveViewInfo('codegraphy.connections')).toEqual({
        view: { id: 'codegraphy.connections' },
      });
      handlers.applyViewTransform();
      handlers.sendAvailableViews();
      handlers.sendMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: { nodes: [], edges: [] },
      });
    });

    mocks.setGraphViewDepthLimit.mockImplementation(async (_state, nextDepthLimit, handlers) => {
      expect(nextDepthLimit).toBe(4);
      expect(handlers.getActiveViewInfo('codegraphy.connections')).toEqual({
        view: { id: 'codegraphy.connections' },
      });
      await handlers.persistDepthLimit(nextDepthLimit);
      handlers.applyViewTransform();
      handlers.sendMessage({
        type: 'DEPTH_LIMIT_UPDATED',
        payload: { depthLimit: nextDepthLimit },
      });
    });

    mocks.getGraphViewDepthLimit.mockImplementation(
      (viewContext: IViewContext, defaultDepthLimit: number) =>
        viewContext.depthLimit ?? defaultDepthLimit,
    );

    const methods = createGraphViewProviderViewSelectionMethods(source as never);
    methods.setFocusedFile('src/index.ts');
    await methods.setDepthLimit(4);

    expect(mocks.setGraphViewFocusedFile).toHaveBeenCalledOnce();
    expect(mocks.setGraphViewDepthLimit).toHaveBeenCalledOnce();
    expect(source._viewRegistry.get).toHaveBeenCalledWith('codegraphy.connections');
    expect(source._context.workspaceState.update).toHaveBeenCalledWith(
      'codegraphy.depthLimit',
      4,
    );
    expect(source._applyViewTransform).toHaveBeenCalledTimes(2);
    expect(source._sendAvailableViews).toHaveBeenCalledOnce();
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'DEPTH_LIMIT_UPDATED',
      payload: { depthLimit: 4 },
    });
    expect(methods.getDepthLimit()).toBe(1);
    expect(mocks.getGraphViewDepthLimit).toHaveBeenCalledWith(source._viewContext, 1);
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
