/**
 * @fileoverview Message event listener setup for App.
 * @module webview/appMessageListener
 */

import type { ExtensionToWebviewMessage } from '../shared/types';
import { postMessage } from './vscodeApi';
import { graphStore } from './store';
import { normalizePluginInjectPayload, parsePluginScopedMessage } from './appMessages';
import type { WebviewPluginHost } from './pluginHost/webviewPluginHost';

export interface InjectAssetsParams {
  pluginId: string;
  scripts: string[];
  styles: string[];
}

/**
 * Create the message event handler for the App's window listener.
 */
export function createMessageHandler(
  injectPluginAssets: (params: InjectAssetsParams) => Promise<void>,
  pluginHost: WebviewPluginHost,
): (event: MessageEvent<unknown>) => void {
  return (event: MessageEvent<unknown>) => {
    const raw = event.data as { type?: unknown; payload?: unknown; data?: unknown };
    if (!raw || typeof raw !== 'object' || typeof raw.type !== 'string') {
      return;
    }

    if (raw.type === 'PLUGIN_WEBVIEW_INJECT') {
      const payload = normalizePluginInjectPayload(raw.payload);
      if (payload) {
        void injectPluginAssets({
          pluginId: payload.pluginId,
          scripts: payload.scripts,
          styles: payload.styles,
        });
      }
      return;
    }

    const scopedMessage = parsePluginScopedMessage(raw.type, raw.data);
    if (scopedMessage) {
      pluginHost.deliverMessage(scopedMessage.pluginId, scopedMessage.message);
      return;
    }

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
): () => void {
  const handleMessage = createMessageHandler(injectPluginAssets, pluginHost);
  window.addEventListener('message', handleMessage);
  postMessage({ type: 'WEBVIEW_READY', payload: null });

  return () => {
    window.removeEventListener('message', handleMessage);
  };
}
