/**
 * @fileoverview Message event listener setup for App.
 * @module webview/appMessageListener
 */

import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import { graphStore } from '../../store/state';
import { parsePluginScopedMessage } from './messages';
import type { WebviewPluginHost } from '../../pluginHost/manager';
import { handlePluginInjectMessage } from './messageListener/pluginInjection';
import { removeDisabledPluginRegistrations } from './messageListener/pluginRegistrations';
import { postWebviewReadyOnce, resetWebviewReadyPosted } from './messageListener/ready';
import { handleCssSnippetsUpdatedMessage } from './messageListener/cssSnippets';

export interface InjectAssetsParams {
  pluginId: string;
  scripts: string[];
  styles: string[];
}

export type ResetPluginAssets = (pluginId: string) => void;

const BACKGROUND_PARTICLES_PLUGIN_ID = 'codegraphy.background-particles';

function deliverBackgroundEffectsUpdateToPlugin(
  raw: { type?: unknown; payload?: unknown },
  pluginHost: WebviewPluginHost,
): void {
  if (raw.type !== 'BACKGROUND_EFFECTS_UPDATED' || !raw.payload || typeof raw.payload !== 'object') {
    return;
  }

  pluginHost.deliverMessage(BACKGROUND_PARTICLES_PLUGIN_ID, {
    type: 'BACKGROUND_EFFECTS_UPDATED',
    data: (raw.payload as { backgroundEffects?: unknown }).backgroundEffects,
  });
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

    if (handlePluginInjectMessage(raw, injectPluginAssets)) {
      return;
    }

    if (handleCssSnippetsUpdatedMessage(raw)) {
      return;
    }

    const scopedMessage = parsePluginScopedMessage(raw.type, raw.data);
    if (scopedMessage) {
      pluginHost.deliverMessage(scopedMessage.pluginId, scopedMessage.message);
      return;
    }

    deliverBackgroundEffectsUpdateToPlugin(raw, pluginHost);
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
  postWebviewReadyOnce(window);

  return () => {
    window.removeEventListener('message', handleMessage);
    resetWebviewReadyPosted(window);
  };
}
