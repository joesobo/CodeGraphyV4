import type {
  GraphViewProviderMethodSource,
  GraphViewProviderMethodSourceOwner,
} from './contracts';

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
    _registerBuiltInPluginRoots: () => owner._pluginResourceMethods._registerBuiltInPluginRoots(),
    _resolveWebviewAssetPath: (assetPath, pluginId) =>
      owner._pluginResourceMethods._resolveWebviewAssetPath(assetPath, pluginId),
    _refreshWebviewResourceRoots: () =>
      owner._pluginResourceMethods._refreshWebviewResourceRoots(),
    _normalizeExternalExtensionUri: uri =>
      owner._pluginResourceMethods._normalizeExternalExtensionUri(uri),
    _loadDisabledRulesAndPlugins: () =>
      owner._settingsStateMethods._loadDisabledRulesAndPlugins(),
    _sendSettings: () => owner._settingsStateMethods._sendSettings(),
    _sendPhysicsSettings: () => owner._physicsSettingsMethods._sendPhysicsSettings(),
    _rebuildAndSend: () => owner._refreshMethods._rebuildAndSend(),
    _smartRebuild: (kind, id) => owner._refreshMethods._smartRebuild(kind, id),
    _getPhysicsSettings: () => owner._physicsSettingsMethods._getPhysicsSettings(),
    _loadGroupsAndFilterPatterns: () =>
      owner._settingsStateMethods._loadGroupsAndFilterPatterns(),
    _sendAllSettings: () => owner._settingsStateMethods._sendAllSettings(),
    _getLocalResourceRoots: () => owner._pluginResourceMethods._getLocalResourceRoots(),
    _updatePhysicsSetting: (key, value) =>
      owner._physicsSettingsMethods._updatePhysicsSetting(key, value),
    _resetPhysicsSettings: () => owner._physicsSettingsMethods._resetPhysicsSettings(),
    _sendFavorites: () => owner._fileVisitMethods._sendFavorites(),
  };
}
