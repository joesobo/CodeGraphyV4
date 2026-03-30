import type { IGraphData } from '../../../src/shared/graph/types';
import type { GraphViewProvider } from '../../../src/extension/graphViewProvider';
import type { GraphViewProviderMethodContainers } from '../../../src/extension/graphView/provider/wiring/methodContainers';

export interface GraphViewProviderInternals {
  _analysisMethods: GraphViewProviderMethodContainers['analysis'];
  _commandMethods: GraphViewProviderMethodContainers['command'];
  _fileActionMethods: GraphViewProviderMethodContainers['fileAction'];
  _fileVisitMethods: GraphViewProviderMethodContainers['fileVisit'];
  _physicsSettingsMethods: GraphViewProviderMethodContainers['physicsSettings'];
  _pluginMethods: GraphViewProviderMethodContainers['plugin'];
  _pluginResourceMethods: GraphViewProviderMethodContainers['pluginResource'];
  _refreshMethods: GraphViewProviderMethodContainers['refresh'];
  _settingsStateMethods: GraphViewProviderMethodContainers['settingsState'];
  _timelineMethods: GraphViewProviderMethodContainers['timeline'];
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
    _fileVisitMethods: runtime._methodContainers.fileVisit,
    _physicsSettingsMethods: runtime._methodContainers.physicsSettings,
    _pluginMethods: runtime._methodContainers.plugin,
    _pluginResourceMethods: runtime._methodContainers.pluginResource,
    _refreshMethods: runtime._methodContainers.refresh,
    _settingsStateMethods: runtime._methodContainers.settingsState,
    _timelineMethods: runtime._methodContainers.timeline,
    _viewContextMethods: runtime._methodContainers.viewContext,
    _viewSelectionMethods: runtime._methodContainers.viewSelection,
    _webviewMethods: runtime._methodContainers.webview,
    _graphData: runtime._graphData,
  };
}
