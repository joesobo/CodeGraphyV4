import type { IGraphData } from '../../../src/shared/graph/contracts';
import type { GraphViewProvider } from '../../../src/extension/graphViewProvider';
import type { GraphViewProviderMethodContainers } from '../../../src/extension/graphView/provider/wiring/methodContainers';

export interface GraphViewProviderInternals {
  _analysisMethods: GraphViewProviderMethodContainers['analysis'];
  _commandMethods: GraphViewProviderMethodContainers['command'];
  _fileActionMethods: GraphViewProviderMethodContainers['fileAction'];
  _fileInfoMethods: GraphViewProviderMethodContainers['fileInfo'];
  _physicsSettingsMethods: GraphViewProviderMethodContainers['physicsSettings'];
  _pluginMethods: GraphViewProviderMethodContainers['plugin'];
  _pluginResourceMethods: GraphViewProviderMethodContainers['pluginResource'];
  _queryMethods: GraphViewProviderMethodContainers['query'];
  _refreshMethods: GraphViewProviderMethodContainers['refresh'];
  _settingsStateMethods: GraphViewProviderMethodContainers['settingsState'];
  _viewContextMethods: GraphViewProviderMethodContainers['viewContext'];
  _viewSelectionMethods: GraphViewProviderMethodContainers['viewSelection'];
  _webviewMethods: GraphViewProviderMethodContainers['webview'];
  _graphData: IGraphData;
}

export function getGraphViewProviderInternals(
  provider: GraphViewProvider,
): GraphViewProviderInternals {
  const runtime = provider as unknown as {
    _graphData: IGraphData;
    _methodContainers: GraphViewProviderMethodContainers;
  };

  return {
    _analysisMethods: runtime._methodContainers.analysis,
    _commandMethods: runtime._methodContainers.command,
    _fileActionMethods: runtime._methodContainers.fileAction,
    _fileInfoMethods: runtime._methodContainers.fileInfo,
    _physicsSettingsMethods: runtime._methodContainers.physicsSettings,
    _pluginMethods: runtime._methodContainers.plugin,
    _pluginResourceMethods: runtime._methodContainers.pluginResource,
    _queryMethods: runtime._methodContainers.query,
    _refreshMethods: runtime._methodContainers.refresh,
    _settingsStateMethods: runtime._methodContainers.settingsState,
    _viewContextMethods: runtime._methodContainers.viewContext,
    _viewSelectionMethods: runtime._methodContainers.viewSelection,
    _webviewMethods: runtime._methodContainers.webview,
    _graphData: runtime._graphData,
  };
}
