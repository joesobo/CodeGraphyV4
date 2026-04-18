import { describe, expect, it, vi } from 'vitest';
import type { IViewContext } from '../../../../../src/core/views/contracts';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import { createGraphViewProviderViewSelectionMethods } from '../../../../../src/extension/graphView/provider/view/selection';

describe('graphView/provider/view/selection', () => {
  it('delegates focused-file updates through view selection helpers', () => {
    const source = createSource();
    const setFocusedFile = vi.fn((_state, nextFilePath, handlers) => {
      expect(nextFilePath).toBe('src/app.ts');
      handlers.applyViewTransform();
      handlers.sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: { nodes: [], edges: [] } });
    });
    const dependencies = createDependencies({
      setFocusedFile,
    });
    const methods = createGraphViewProviderViewSelectionMethods(
      source as never,
      dependencies,
    );

    methods.setFocusedFile('src/app.ts');

    expect(setFocusedFile).toHaveBeenCalledOnce();
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
    expect(dependencies.persistSetting).toHaveBeenCalledWith(
      'depthLimit',
      7,
    );
    expect(methods.getDepthLimit()).toBe(7);
    expect(getDepthLimit).toHaveBeenCalledWith(source._viewContext, 1);
  });

  it('toggles depth mode and tolerates missing transform broadcasters', async () => {
    const source = createSource({
      _applyViewTransform: undefined,
    });
    const dependencies = createDependencies();
    const methods = createGraphViewProviderViewSelectionMethods(
      source as never,
      dependencies,
    );

    await methods.setDepthMode(true);

    expect(dependencies.persistSetting).toHaveBeenCalledWith('depthMode', true);
    expect(source._depthMode).toBe(true);
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'DEPTH_MODE_UPDATED',
      payload: { depthMode: true },
    });
  });

  it('delegates focused-file and depth-limit handlers without view lookup helpers', async () => {
    const source = createSource({
      _applyViewTransform: undefined,
    });
    const setFocusedFile = vi.fn((_state, nextFilePath, handlers) => {
      expect(nextFilePath).toBeUndefined();
      handlers.applyViewTransform();
      handlers.sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: { nodes: [], edges: [] } });
    });
    const setDepthLimit = vi.fn(async (_state, nextDepthLimit, handlers) => {
      expect(nextDepthLimit).toBe(4);
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

    expect(dependencies.persistSetting).toHaveBeenCalledWith(
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
    _viewContext: {
      activePlugins: new Set<string>(),
      depthLimit: 1,
    } satisfies IViewContext,
    _depthMode: false,
    _applyViewTransform: vi.fn(),
    _sendMessage: vi.fn(),
    _graphData: { nodes: [], edges: [] } satisfies IGraphData,
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
    setFocusedFile: vi.fn(),
    setDepthLimit: vi.fn(async () => undefined),
    getDepthLimit: vi.fn((viewContext: IViewContext, defaultDepthLimit: number) =>
      viewContext.depthLimit ?? defaultDepthLimit,
    ),
    getConfiguration: vi.fn(() => configuration),
    persistSetting: vi.fn((_: string, __: unknown) => Promise.resolve()),
    defaultDepthLimit: 1,
    depthLimitKey: 'depthLimit',
    ...overrides,
  };
}
