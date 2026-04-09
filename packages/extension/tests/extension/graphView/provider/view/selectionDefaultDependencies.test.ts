import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
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
  let configuration: {
    get: <T>(section: string, defaultValue: T) => T;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mocks.changeGraphViewView.mockReset();
    mocks.setGraphViewFocusedFile.mockReset();
    mocks.setGraphViewDepthLimit.mockReset();
    mocks.getGraphViewDepthLimit.mockReset();
    configuration = {
      get: ((_: string, defaultValue: unknown) => defaultValue) as <T>(
        section: string,
        defaultValue: T,
      ) => T,
      update: vi.fn(() => Promise.resolve()),
    };
    (vscode.workspace as unknown as { getConfiguration: ReturnType<typeof vi.fn> }).getConfiguration =
      vi.fn(() => configuration);
  });

  it('uses the default view switching delegates without persisting a selected view', async () => {
    const source = createSource();

    mocks.changeGraphViewView.mockImplementation(async (_state, nextViewId, handlers) => {
      expect(nextViewId).toBe('codegraphy.depth-graph');
      await handlers.persistDepthMode(true);
      handlers.applyViewTransform();
      handlers.sendMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: { nodes: [], edges: [] },
      });
    });

    const methods = createGraphViewProviderViewSelectionMethods(source as never);
    await methods.changeView('codegraphy.depth-graph');

    expect(mocks.changeGraphViewView).toHaveBeenCalledOnce();
    expect(configuration.update).not.toHaveBeenCalledWith(
      expect.stringMatching(/selectedView/),
      expect.anything(),
    );
    expect(configuration.update).toHaveBeenCalledWith('depthMode', true);
    expect(source._applyViewTransform).toHaveBeenCalledOnce();
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
  });

  it('uses the default focused-file, depth-limit, and readback delegates', async () => {
    const source = createSource();

    mocks.setGraphViewFocusedFile.mockImplementation((_state, nextFilePath, handlers) => {
      expect(nextFilePath).toBe('src/index.ts');
      handlers.applyViewTransform();
      handlers.sendMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: { nodes: [], edges: [] },
      });
    });

    mocks.setGraphViewDepthLimit.mockImplementation(async (_state, nextDepthLimit, handlers) => {
      expect(nextDepthLimit).toBe(4);
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
    expect(configuration.update).toHaveBeenCalledWith(
      'depthLimit',
      4,
    );
    expect(source._applyViewTransform).toHaveBeenCalledTimes(2);
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
    _depthMode: false,
    _applyViewTransform: vi.fn(),
    _sendAvailableViews: vi.fn(),
    _sendMessage: vi.fn(),
    _graphData: { nodes: [], edges: [] } satisfies IGraphData,
  };
}
