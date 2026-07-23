import type { GraphViewMessageListenerContext } from '../../messages/listener';

export type GraphViewProviderSettingsContext = Pick<
  GraphViewMessageListenerContext,
  | 'getDepthMode'
  | 'updateNodeSizeMode'
  | 'getConfig'
  | 'updateConfig'
  | 'getInstalledPluginUpdateImpact'
  | 'reloadWorkspacePlugins'
  | 'syncWorkspacePlugins'
  | 'sendPluginStatuses'
  | 'sendPluginWebviewInjections'
  | 'sendGraphControls'
  | 'analyzeAndSendData'
  | 'schedulePluginGraphWork'
  | 'cancelScheduledPluginGraphWork'
  | 'hydrateGraphScope'
  | 'hydratePluginGraphScope'
  | 'reprocessGraphScope'
  | 'reprocessPluginFiles'
  | 'resetAllSettings'
  | 'getMaxFiles'
  | 'getNodeSizeMode'
>;
