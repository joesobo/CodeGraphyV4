import type {
  GraphViewProviderMethodSource,
  GraphViewProviderMethodSourceOwner,
} from '../contracts';

export function createGraphViewProviderSettingsMethodDelegates(
  owner: GraphViewProviderMethodSourceOwner,
): Pick<
  GraphViewProviderMethodSource,
  | '_registerBuiltInPluginRoots'
  | '_resolveWebviewAssetPath'
  | '_refreshWebviewResourceRoots'
  | '_normalizeExternalExtensionUri'
  | '_loadDisabledRulesAndPlugins'
  | '_sendSettings'
  | '_sendPhysicsSettings'
  | '_rebuildAndSend'
  | '_smartRebuild'
  | '_getPhysicsSettings'
  | '_loadGroupsAndFilterPatterns'
  | '_sendAllSettings'
  | '_getLocalResourceRoots'
  | '_updatePhysicsSetting'
  | '_resetPhysicsSettings'
  | '_sendFavorites'
> {
  return {
    _registerBuiltInPluginRoots: () =>
      owner._methodContainers.pluginResource._registerBuiltInPluginRoots(),
    _resolveWebviewAssetPath: (assetPath, pluginId) =>
      owner._methodContainers.pluginResource._resolveWebviewAssetPath(assetPath, pluginId),
    _refreshWebviewResourceRoots: () =>
      owner._methodContainers.pluginResource._refreshWebviewResourceRoots(),
    _normalizeExternalExtensionUri: uri =>
      owner._methodContainers.pluginResource._normalizeExternalExtensionUri(uri),
    _loadDisabledRulesAndPlugins: () =>
      owner._methodContainers.settingsState._loadDisabledRulesAndPlugins(),
    _sendSettings: () => owner._methodContainers.settingsState._sendSettings(),
    _sendPhysicsSettings: () => owner._methodContainers.physicsSettings._sendPhysicsSettings(),
    _rebuildAndSend: () => owner._methodContainers.refresh._rebuildAndSend(),
    _smartRebuild: id => owner._methodContainers.refresh._smartRebuild(id),
    _getPhysicsSettings: () => owner._methodContainers.physicsSettings._getPhysicsSettings(),
    _loadGroupsAndFilterPatterns: () =>
      owner._methodContainers.settingsState._loadGroupsAndFilterPatterns(),
    _sendAllSettings: () => owner._methodContainers.settingsState._sendAllSettings(),
    _getLocalResourceRoots: () => owner._methodContainers.pluginResource._getLocalResourceRoots(),
    _updatePhysicsSetting: (key, value) =>
      owner._methodContainers.physicsSettings._updatePhysicsSetting(key, value),
    _resetPhysicsSettings: () => owner._methodContainers.physicsSettings._resetPhysicsSettings(),
    _sendFavorites: () => owner._methodContainers.fileVisit._sendFavorites(),
  };
}
