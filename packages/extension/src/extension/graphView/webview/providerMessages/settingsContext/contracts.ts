import type { GraphViewMessageListenerContext } from '../../messages/listener';

export type GraphViewProviderSettingsContext = Pick<
  GraphViewMessageListenerContext,
  | 'getDepthMode'
  | 'updateNodeSizeMode'
  | 'getConfig'
  | 'updateConfig'
  | 'getInstalledPluginUpdateImpact'
  | 'sendPluginStatuses'
  | 'sendPluginWebviewInjections'
  | 'sendGraphControls'
  | 'reloadCachedGraph'
  | 'schedulePluginGraphWork'
  | 'cancelScheduledPluginGraphWork'
  | 'hydrateGraphScope'
  | 'hydratePluginGraphScope'
  | 'resetAllSettings'
  | 'getMaxFiles'
  | 'getNodeSizeMode'
>;
