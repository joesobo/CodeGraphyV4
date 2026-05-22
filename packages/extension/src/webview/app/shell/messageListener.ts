/**
 * @fileoverview Message event listener setup for App.
 * @module webview/appMessageListener
 */

import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import { postMessage } from '../../vscodeApi';
import { graphStore } from '../../store/state';
import { normalizePluginInjectPayload, parsePluginScopedMessage } from './messages';
import type { WebviewPluginHost } from '../../pluginHost/manager';

type WindowWithCodeGraphyReadyFlag = Window & {
  __codegraphyWebviewReadyPosted?: boolean;
};

export interface InjectAssetsParams {
  pluginId: string;
  scripts: string[];
  styles: string[];
}

export type ResetPluginAssets = (pluginId: string) => void;

function removePluginRuntime(
  pluginId: string,
  pluginHost: WebviewPluginHost,
  resetPluginAssets?: ResetPluginAssets,
): void {
  pluginHost.removePlugin(pluginId);
  resetPluginAssets?.(pluginId);
}

function removeDisabledPluginRegistrations(
  raw: { type?: unknown; payload?: unknown },
  pluginHost: WebviewPluginHost,
  packagePluginIdsByPackageName: Map<string, string>,
  resetPluginAssets?: ResetPluginAssets,
): void {
  if (raw.type !== 'PLUGINS_UPDATED' || !raw.payload || typeof raw.payload !== 'object') {
    return;
  }

  const plugins = (raw.payload as { plugins?: unknown }).plugins;
  if (!Array.isArray(plugins)) {
    return;
  }

  for (const plugin of plugins) {
    if (!plugin || typeof plugin !== 'object') {
      continue;
    }

    const candidate = plugin as { enabled?: unknown; id?: unknown; packageName?: unknown };
    if (typeof candidate.id !== 'string') {
      continue;
    }

    const packageName = typeof candidate.packageName === 'string'
      ? candidate.packageName
      : undefined;
    if (candidate.enabled !== false && packageName) {
      packagePluginIdsByPackageName.set(packageName, candidate.id);
      continue;
    }

    if (candidate.enabled === false) {
      removePluginRuntime(candidate.id, pluginHost, resetPluginAssets);
      if (packageName) {
        const runtimePluginId = packagePluginIdsByPackageName.get(packageName);
        if (runtimePluginId && runtimePluginId !== candidate.id) {
          removePluginRuntime(runtimePluginId, pluginHost, resetPluginAssets);
        }
        packagePluginIdsByPackageName.delete(packageName);
      }
    }
  }
}

/**
 * Create the message event handler for the App's window listener.
 */
export function createMessageHandler(
  injectPluginAssets: (params: InjectAssetsParams) => Promise<void>,
  pluginHost: WebviewPluginHost,
  resetPluginAssets?: ResetPluginAssets,
): (event: MessageEvent<unknown>) => void {
  const packagePluginIdsByPackageName = new Map<string, string>();

  return (event: MessageEvent<unknown>) => {
    const raw = event.data as { type?: unknown; payload?: unknown; data?: unknown };
    if (!raw || typeof raw !== 'object' || typeof raw.type !== 'string') {
      return;
    }

    if (raw.type === 'PLUGIN_WEBVIEW_INJECT') {
      const payload = normalizePluginInjectPayload(raw.payload);
      if (payload) {
        const store = graphStore.getState();
        store.beginPluginAssetLoad();
        void injectPluginAssets({
          pluginId: payload.pluginId,
          scripts: payload.scripts,
          styles: payload.styles,
        }).finally(() => {
          graphStore.getState().finishPluginAssetLoad();
        });
      }
      return;
    }

    const scopedMessage = parsePluginScopedMessage(raw.type, raw.data);
    if (scopedMessage) {
      pluginHost.deliverMessage(scopedMessage.pluginId, scopedMessage.message);
      return;
    }

    removeDisabledPluginRegistrations(raw, pluginHost, packagePluginIdsByPackageName, resetPluginAssets);
    graphStore.getState().handleExtensionMessage(raw as ExtensionToWebviewMessage);
  };
}

/**
 * Set up the window message listener and send WEBVIEW_READY.
 * Returns a cleanup function.
 */
export function setupMessageListener(
  injectPluginAssets: (params: InjectAssetsParams) => Promise<void>,
  pluginHost: WebviewPluginHost,
  resetPluginAssets?: ResetPluginAssets,
): () => void {
  const handleMessage = createMessageHandler(injectPluginAssets, pluginHost, resetPluginAssets);
  window.addEventListener('message', handleMessage);
  const codeGraphyWindow = window as WindowWithCodeGraphyReadyFlag;
  // Keep the ready handshake single-shot for one webview page load. This avoids
  // duplicate ready messages during React development replays such as StrictMode.
  if (!codeGraphyWindow.__codegraphyWebviewReadyPosted) {
    codeGraphyWindow.__codegraphyWebviewReadyPosted = true;
    graphStore.getState().beginInitialBootstrap();
    postMessage({ type: 'WEBVIEW_READY', payload: null });
  }

  return () => {
    window.removeEventListener('message', handleMessage);
  };
}
