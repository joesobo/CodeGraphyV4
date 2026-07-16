import type { GraphViewProviderMethodContainers } from '../wiring/methodContainers';

type MethodContainerAccessorTarget = {
  _methodContainers: GraphViewProviderMethodContainers;
};

export function defineGraphViewProviderMethodAccessors(
  target: MethodContainerAccessorTarget,
): void {
  Object.defineProperties(target, {
    _analysisMethods: {
      get: () => target._methodContainers.analysis,
    },
    _commandMethods: {
      get: () => target._methodContainers.command,
    },
    _fileActionMethods: {
      get: () => target._methodContainers.fileAction,
    },
    _fileInfoMethods: {
      get: () => target._methodContainers.fileInfo,
    },
    _pluginMethods: {
      get: () => target._methodContainers.plugin,
    },
    _pluginResourceMethods: {
      get: () => target._methodContainers.pluginResource,
    },
    _physicsSettingsMethods: {
      get: () => target._methodContainers.physicsSettings,
    },
    _queryMethods: {
      get: () => target._methodContainers.query,
    },
    _refreshMethods: {
      get: () => target._methodContainers.refresh,
    },
    _settingsStateMethods: {
      get: () => target._methodContainers.settingsState,
    },
    _viewContextMethods: {
      get: () => target._methodContainers.viewContext,
    },
    _viewSelectionMethods: {
      get: () => target._methodContainers.viewSelection,
    },
    _webviewMethods: {
      get: () => target._methodContainers.webview,
    },
  });
}
