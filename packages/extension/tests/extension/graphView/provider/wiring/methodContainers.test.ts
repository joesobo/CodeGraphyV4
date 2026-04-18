import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockedFactories = vi.hoisted(() => {
  const methodSource = { kind: 'source' };
  const analysis = { kind: 'analysis' };
  const command = { kind: 'command' };
  const fileAction = { kind: 'fileAction' };
  const fileVisit = { kind: 'fileVisit' };
  const physicsSettings = { kind: 'physicsSettings' };
  const plugin = { kind: 'plugin' };
  const pluginResource = { kind: 'pluginResource' };
  const refresh = { kind: 'refresh' };
  const settingsState = { kind: 'settingsState' };
  const timeline = { kind: 'timeline' };
  const viewContext = { kind: 'viewContext' };
  const viewSelection = { kind: 'viewSelection' };
  const webview = { kind: 'webview' };

  return {
    methodSource,
    analysis,
    command,
    fileAction,
    fileVisit,
    physicsSettings,
    plugin,
    pluginResource,
    refresh,
    settingsState,
    timeline,
    viewContext,
    viewSelection,
    webview,
    createGraphViewProviderMethodSource: vi.fn(() => methodSource),
    createGraphViewProviderAnalysisMethods: vi.fn(() => analysis),
    createGraphViewProviderCommandMethods: vi.fn(() => command),
    createGraphViewProviderFileActionMethods: vi.fn(() => fileAction),
    createGraphViewProviderFileVisitMethods: vi.fn(() => fileVisit),
    createGraphViewProviderPhysicsSettingsMethods: vi.fn(() => physicsSettings),
    createGraphViewProviderPluginMethods: vi.fn(() => plugin),
    createGraphViewProviderPluginResourceMethods: vi.fn(() => pluginResource),
    createGraphViewProviderRefreshMethods: vi.fn(() => refresh),
    createGraphViewProviderSettingsStateMethods: vi.fn(() => settingsState),
    createGraphViewProviderTimelineMethods: vi.fn(() => timeline),
    createGraphViewProviderViewContextMethods: vi.fn(() => viewContext),
    createGraphViewProviderViewSelectionMethods: vi.fn(() => viewSelection),
    createGraphViewProviderWebviewMethods: vi.fn(() => webview),
  };
});

vi.mock('../../../../../src/extension/graphView/provider/source/create', () => ({
  createGraphViewProviderMethodSource: mockedFactories.createGraphViewProviderMethodSource,
}));
vi.mock('../../../../../src/extension/graphView/provider/analysis/methods', () => ({
  createGraphViewProviderAnalysisMethods: mockedFactories.createGraphViewProviderAnalysisMethods,
}));
vi.mock('../../../../../src/extension/graphView/provider/commands', () => ({
  createGraphViewProviderCommandMethods: mockedFactories.createGraphViewProviderCommandMethods,
}));
vi.mock('../../../../../src/extension/graphView/provider/file/actions', () => ({
  createGraphViewProviderFileActionMethods: mockedFactories.createGraphViewProviderFileActionMethods,
}));
vi.mock('../../../../../src/extension/graphView/provider/file/visits', () => ({
  createGraphViewProviderFileVisitMethods: mockedFactories.createGraphViewProviderFileVisitMethods,
}));
vi.mock('../../../../../src/extension/graphView/provider/physicsSettings', () => ({
  createGraphViewProviderPhysicsSettingsMethods:
    mockedFactories.createGraphViewProviderPhysicsSettingsMethods,
}));
vi.mock('../../../../../src/extension/graphView/provider/plugin/methods', () => ({
  createGraphViewProviderPluginMethods: mockedFactories.createGraphViewProviderPluginMethods,
}));
vi.mock('../../../../../src/extension/graphView/provider/plugin/resources', () => ({
  createGraphViewProviderPluginResourceMethods:
    mockedFactories.createGraphViewProviderPluginResourceMethods,
}));
vi.mock('../../../../../src/extension/graphView/provider/refresh', () => ({
  createGraphViewProviderRefreshMethods: mockedFactories.createGraphViewProviderRefreshMethods,
}));
vi.mock('../../../../../src/extension/graphView/provider/settingsState', () => ({
  createGraphViewProviderSettingsStateMethods:
    mockedFactories.createGraphViewProviderSettingsStateMethods,
}));
vi.mock('../../../../../src/extension/graphView/provider/timeline/methods', () => ({
  createGraphViewProviderTimelineMethods: mockedFactories.createGraphViewProviderTimelineMethods,
}));
vi.mock('../../../../../src/extension/graphView/provider/view/context', () => ({
  createGraphViewProviderViewContextMethods:
    mockedFactories.createGraphViewProviderViewContextMethods,
}));
vi.mock('../../../../../src/extension/graphView/provider/view/selection', () => ({
  createGraphViewProviderViewSelectionMethods:
    mockedFactories.createGraphViewProviderViewSelectionMethods,
}));
vi.mock('../../../../../src/extension/graphView/provider/webview/host', () => ({
  createGraphViewProviderWebviewMethods: mockedFactories.createGraphViewProviderWebviewMethods,
}));

import { createGraphViewProviderMethodContainers } from '../../../../../src/extension/graphView/provider/wiring/methodContainers';

describe('graphView/provider/wiring/methodContainers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates every method container from a shared method source', () => {
    const owner = { kind: 'owner' };

    const result = createGraphViewProviderMethodContainers(owner as never);

    expect(mockedFactories.createGraphViewProviderMethodSource).toHaveBeenCalledWith(owner);
    expect(mockedFactories.createGraphViewProviderAnalysisMethods).toHaveBeenCalledWith(
      mockedFactories.methodSource,
    );
    expect(mockedFactories.createGraphViewProviderCommandMethods).toHaveBeenCalledWith(
      mockedFactories.methodSource,
    );
    expect(mockedFactories.createGraphViewProviderFileActionMethods).toHaveBeenCalledWith(
      mockedFactories.methodSource,
    );
    expect(mockedFactories.createGraphViewProviderFileVisitMethods).toHaveBeenCalledWith(
      mockedFactories.methodSource,
    );
    expect(mockedFactories.createGraphViewProviderPhysicsSettingsMethods).toHaveBeenCalledWith(
      mockedFactories.methodSource,
    );
    expect(mockedFactories.createGraphViewProviderPluginMethods).toHaveBeenCalledWith(
      mockedFactories.methodSource,
    );
    expect(mockedFactories.createGraphViewProviderPluginResourceMethods).toHaveBeenCalledWith(
      mockedFactories.methodSource,
    );
    expect(mockedFactories.createGraphViewProviderRefreshMethods).toHaveBeenCalledWith(
      mockedFactories.methodSource,
    );
    expect(mockedFactories.createGraphViewProviderSettingsStateMethods).toHaveBeenCalledWith(
      mockedFactories.methodSource,
    );
    expect(mockedFactories.createGraphViewProviderTimelineMethods).toHaveBeenCalledWith(
      mockedFactories.methodSource,
    );
    expect(mockedFactories.createGraphViewProviderViewContextMethods).toHaveBeenCalledWith(
      mockedFactories.methodSource,
    );
    expect(mockedFactories.createGraphViewProviderViewSelectionMethods).toHaveBeenCalledWith(
      mockedFactories.methodSource,
    );
    expect(mockedFactories.createGraphViewProviderWebviewMethods).toHaveBeenCalledWith(
      mockedFactories.methodSource,
    );
    expect(result).toEqual({
      analysis: mockedFactories.analysis,
      command: mockedFactories.command,
      fileAction: mockedFactories.fileAction,
      fileVisit: mockedFactories.fileVisit,
      physicsSettings: mockedFactories.physicsSettings,
      plugin: mockedFactories.plugin,
      pluginResource: mockedFactories.pluginResource,
      refresh: mockedFactories.refresh,
      settingsState: mockedFactories.settingsState,
      timeline: mockedFactories.timeline,
      viewContext: mockedFactories.viewContext,
      viewSelection: mockedFactories.viewSelection,
      webview: mockedFactories.webview,
    });
  });
});
