import type { MutableRefObject } from 'react';
import type { PluginInjectPayload } from '../app/shell/messages';
import type { CodeGraphyWebviewAPI } from '../pluginHost/api/contracts/webview';
import type { WebviewPluginHost } from '../pluginHost/manager';

export interface IPluginManager {
  pluginHost: WebviewPluginHost;
  injectPluginAssets: (payload: PluginInjectPayload) => Promise<void>;
  resetPluginAssets: (pluginId: string) => void;
  updatePluginData: (pluginId: string, data: unknown) => void;
}

export interface LoadedPluginStyle {
  link: HTMLLinkElement;
  pluginIds: Set<string>;
}

export interface PluginManagerRefs {
  activatedScriptKeys: MutableRefObject<Set<string>>;
  activatingScriptPromises: MutableRefObject<Map<string, Promise<void>>>;
  loadedStyles: MutableRefObject<Map<string, LoadedPluginStyle>>;
  pluginActivationCleanups: MutableRefObject<Map<string, Set<{ dispose(): void }>>>;
  pluginApis: MutableRefObject<Map<string, CodeGraphyWebviewAPI>>;
  pluginAssetVersions: MutableRefObject<Map<string, number>>;
  pluginAssetRevisions: MutableRefObject<Map<string, string>>;
  pluginStyles: MutableRefObject<Map<string, Set<string>>>;
  pluginData: MutableRefObject<Map<string, unknown>>;
  pluginHost: MutableRefObject<WebviewPluginHost>;
}
