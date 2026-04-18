import type { GraphViewProviderMethodSource, GraphViewProviderMethodSourceOwner } from '../contracts';

export function createGraphViewProviderPluginMethodDelegates(
  owner: GraphViewProviderMethodSourceOwner,
): Pick<
  GraphViewProviderMethodSource,
  | '_sendGraphControls'
  | '_sendPluginStatuses'
  | '_sendDecorations'
  | '_sendContextMenuItems'
  | '_sendPluginExporters'
  | '_sendPluginToolbarActions'
  | '_sendPluginWebviewInjections'
  | '_sendGroupsUpdated'
  | 'registerExternalPlugin'
> {
  return {
    _sendGraphControls: () => owner._methodContainers.plugin._sendGraphControls(),
    _sendPluginStatuses: () => owner._methodContainers.plugin._sendPluginStatuses(),
    _sendDecorations: () => owner._methodContainers.plugin._sendDecorations(),
    _sendContextMenuItems: () => owner._methodContainers.plugin._sendContextMenuItems(),
    _sendPluginExporters: () => owner._methodContainers.plugin._sendPluginExporters(),
    _sendPluginToolbarActions: () => owner._methodContainers.plugin._sendPluginToolbarActions(),
    _sendPluginWebviewInjections: () => owner._methodContainers.plugin._sendPluginWebviewInjections(),
    _sendGroupsUpdated: () => owner._methodContainers.plugin._sendGroupsUpdated(),
    registerExternalPlugin: (plugin, options) =>
      owner._methodContainers.plugin.registerExternalPlugin(plugin, options),
  };
}
