import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createContext,
  GraphViewProvider,
  getGraphViewProviderInternals,
  resetGraphViewProviderPublicApi,
  vscode,
} from './graphViewProvider.publicApi.fixture';

describe('GraphViewProvider public API', () => {
  beforeEach(resetGraphViewProviderPublicApi);

  it('exposes the internal view registry through the public getter', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );

    expect(provider.viewRegistry).toBe(
      (provider as unknown as { _viewRegistry: unknown })._viewRegistry
    );
  });

  it('updates and returns graph data through the public graph accessors', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const sendMessageSpy = vi.spyOn(
      internals._webviewMethods,
      '_sendMessage'
    ).mockImplementation(() => {});
    const graphData = {
      nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#ffffff' }],
      edges: [],
    };

    provider.updateGraphData(graphData);

    expect(provider.getGraphData()).toEqual(graphData);
    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: graphData,
    });
  });

  it('refreshPhysicsSettings delegates to the physics message sender', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const sendPhysicsSpy = vi.spyOn(
      internals._physicsSettingsMethods,
      '_sendPhysicsSettings'
    ).mockImplementation(() => {});

    provider.refreshPhysicsSettings();

    expect(sendPhysicsSpy).toHaveBeenCalledTimes(1);
  });

  it('refreshSettings delegates to the settings message sender', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const sendSettingsSpy = vi.spyOn(
      internals._settingsStateMethods,
      '_sendSettings'
    ).mockImplementation(() => {});

    provider.refreshSettings();

    expect(sendSettingsSpy).toHaveBeenCalledTimes(1);
  });

  it('queryGraph delegates to the query method container', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const querySpy = vi.spyOn(internals._queryMethods, 'queryGraph').mockReturnValue({
      nodes: [{ path: 'src/app.ts', nodeType: 'file' }],
      page: { offset: 0, limit: 500, returned: 1, total: 1 },
    });
    const query = { report: 'nodes' as const, arguments: {} };

    expect(provider.queryGraph(query)).toEqual({
      nodes: [{ path: 'src/app.ts', nodeType: 'file' }],
      page: { offset: 0, limit: 500, returned: 1, total: 1 },
    });
    expect(querySpy).toHaveBeenCalledWith(query);
  });

  it('returns the current depth limit through the public API', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);

    vi.spyOn(internals._viewSelectionMethods, 'getDepthLimit').mockReturnValue(7);

    expect(provider.getDepthLimit()).toBe(7);
  });

});
