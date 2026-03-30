import * as vscode from 'vscode';
import { describe, expect, it } from 'vitest';
import { createGraphViewProviderSettingsMethodDelegates } from '../../../../../src/extension/graphView/provider/source/settingsDelegates';
import { createMethodSourceOwnerStub } from './fakes';

describe('source/settingsDelegates', () => {
  it('forwards settings, resources, refresh, and favorites delegates', async () => {
    const owner = createMethodSourceOwnerStub();
    const delegates = createGraphViewProviderSettingsMethodDelegates(owner);
    const assetPath = 'media/plugin.js';
    const pluginId = 'plugin.test';
    const uri = vscode.Uri.file('/test/plugin');

    delegates._registerBuiltInPluginRoots();
    delegates._resolveWebviewAssetPath(assetPath, pluginId);
    delegates._refreshWebviewResourceRoots();
    delegates._normalizeExternalExtensionUri(uri);
    delegates._loadDisabledRulesAndPlugins();
    delegates._sendSettings();
    delegates._sendPhysicsSettings();
    await delegates._rebuildAndSend!();
    delegates._smartRebuild!('plugin', 'plugin.test');
    delegates._getPhysicsSettings();
    delegates._loadGroupsAndFilterPatterns();
    delegates._sendAllSettings();
    delegates._getLocalResourceRoots();
    delegates._updatePhysicsSetting!('repelForce', -180);
    delegates._resetPhysicsSettings!();
    delegates._sendFavorites?.();

    expect(owner._pluginResourceMethods._registerBuiltInPluginRoots).toHaveBeenCalledTimes(1);
    expect(owner._pluginResourceMethods._resolveWebviewAssetPath).toHaveBeenCalledWith(
      assetPath,
      pluginId,
    );
    expect(owner._pluginResourceMethods._refreshWebviewResourceRoots).toHaveBeenCalledTimes(1);
    expect(owner._pluginResourceMethods._normalizeExternalExtensionUri).toHaveBeenCalledWith(uri);
    expect(owner._settingsStateMethods._loadDisabledRulesAndPlugins).toHaveBeenCalledTimes(1);
    expect(owner._settingsStateMethods._sendSettings).toHaveBeenCalledTimes(1);
    expect(owner._physicsSettingsMethods._sendPhysicsSettings).toHaveBeenCalledTimes(1);
    expect(owner._refreshMethods._rebuildAndSend).toHaveBeenCalledTimes(1);
    expect(owner._refreshMethods._smartRebuild).toHaveBeenCalledWith('plugin', 'plugin.test');
    expect(owner._physicsSettingsMethods._getPhysicsSettings).toHaveBeenCalledTimes(1);
    expect(owner._settingsStateMethods._loadGroupsAndFilterPatterns).toHaveBeenCalledTimes(1);
    expect(owner._settingsStateMethods._sendAllSettings).toHaveBeenCalledTimes(1);
    expect(owner._pluginResourceMethods._getLocalResourceRoots).toHaveBeenCalledTimes(1);
    expect(owner._physicsSettingsMethods._updatePhysicsSetting).toHaveBeenCalledWith(
      'repelForce',
      -180,
    );
    expect(owner._physicsSettingsMethods._resetPhysicsSettings).toHaveBeenCalledTimes(1);
    expect(owner._fileVisitMethods._sendFavorites).toHaveBeenCalledTimes(1);
  });
});
