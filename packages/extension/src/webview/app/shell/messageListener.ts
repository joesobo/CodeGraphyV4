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
import { handlePluginDataUpdatedMessage } from './messageListener/pluginData';
import { postWebviewReadyOnce, resetWebviewReadyPosted } from './messageListener/ready';
import { handleCssSnippetsUpdatedMessage } from './messageListener/cssSnippets';
import {
  webviewGraphPerfControl,
  type WebviewGraphPerfControl,
} from '../../perf/graph/control';

export interface InjectAssetsParams {
  pluginId: string;
  scripts: string[];
  styles: string[];
  assets?: Array<{
    id: string;
    label: string;
    url: string;
    path?: string;
    kind?: string;
    metadata?: Record<string, unknown>;
  }>;
}

export type ResetPluginAssets = (pluginId: string) => void;
export type UpdatePluginData = (pluginId: string, data: unknown) => void;

/**
 * Create the message event handler for the App's window listener.
 */
export function createMessageHandler(
  injectPluginAssets: (params: InjectAssetsParams) => Promise<void>,
  pluginHost: WebviewPluginHost,
  resetPluginAssets?: ResetPluginAssets,
  updatePluginData: UpdatePluginData = () => undefined,
  perfControl: Pick<WebviewGraphPerfControl, 'handleControl'> = webviewGraphPerfControl,
): (event: MessageEvent<unknown>) => void {
  const packagePluginIdsByPackageName = new Map<string, string>();

  return (event: MessageEvent<unknown>) => {
    const raw = event.data as { type?: unknown; payload?: unknown; data?: unknown };
    if (!raw || typeof raw !== 'object' || typeof raw.type !== 'string') {
      return;
    }
    if (raw.type === 'PERF_CONTROL' && perfControl.handleControl(raw)) {
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

    if (handlePluginDataUpdatedMessage(raw, updatePluginData)) {
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
  updatePluginData?: UpdatePluginData,
): () => void {
  const handleMessage = createMessageHandler(injectPluginAssets, pluginHost, resetPluginAssets, updatePluginData);
  window.addEventListener('message', handleMessage);
  postWebviewReadyOnce(window);

  return () => {
    window.removeEventListener('message', handleMessage);
    resetWebviewReadyPosted(window);
  };
}
