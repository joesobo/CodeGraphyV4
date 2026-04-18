import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { IViewContext } from '../../../../../src/core/views/contracts';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';

const mocks = vi.hoisted(() => ({
  setGraphViewFocusedFile: vi.fn(),
  setGraphViewDepthLimit: vi.fn(),
  getGraphViewDepthLimit: vi.fn(),
  updateCodeGraphyConfigurationSilently: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../../src/extension/graphView/view/selection', () => ({
  setGraphViewFocusedFile: mocks.setGraphViewFocusedFile,
  setGraphViewDepthLimit: mocks.setGraphViewDepthLimit,
  getGraphViewDepthLimit: mocks.getGraphViewDepthLimit,
}));

vi.mock('../../../../../src/extension/repoSettings/current', () => ({
  updateCodeGraphyConfigurationSilently: mocks.updateCodeGraphyConfigurationSilently,
}));

import { createGraphViewProviderViewSelectionMethods } from '../../../../../src/extension/graphView/provider/view/selection';

describe('graphView/provider/view/selection default dependencies', () => {
  let configuration: {
    get: <T>(section: string, defaultValue: T) => T;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mocks.setGraphViewFocusedFile.mockReset();
    mocks.setGraphViewDepthLimit.mockReset();
    mocks.getGraphViewDepthLimit.mockReset();
    mocks.updateCodeGraphyConfigurationSilently.mockReset();
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

  it('uses the default depth mode persistence delegates', async () => {
    const source = createSource();

    const methods = createGraphViewProviderViewSelectionMethods(source as never);
    await methods.setDepthMode(true);

    expect(mocks.updateCodeGraphyConfigurationSilently).toHaveBeenCalledWith('depthMode', true);
    expect(configuration.update).not.toHaveBeenCalled();
    expect(source._applyViewTransform).toHaveBeenCalledOnce();
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'DEPTH_MODE_UPDATED',
      payload: { depthMode: true },
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
    expect(mocks.updateCodeGraphyConfigurationSilently).toHaveBeenCalledWith('depthLimit', 4);
    expect(configuration.update).not.toHaveBeenCalled();
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
    _viewContext: {
      activePlugins: new Set<string>(),
      depthLimit: 1,
    } satisfies IViewContext,
    _depthMode: false,
    _applyViewTransform: vi.fn(),
    _sendMessage: vi.fn(),
    _graphData: { nodes: [], edges: [] } satisfies IGraphData,
  };
}
