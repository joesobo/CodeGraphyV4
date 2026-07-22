/**
 * @fileoverview Message event listener setup for App.
 * @module webview/appMessageListener
 */

import type { WebviewPluginHost } from '../../pluginHost/manager';
import { postWebviewReadyOnce, resetWebviewReadyPosted } from './messageListener/ready';
import {
  routeExtensionMessage,
  type RawExtensionMessage,
} from './messageListener/route';

export interface InjectAssetsParams {
  pluginId: string;
  revision?: string;
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

function parseExtensionMessage(data: unknown): RawExtensionMessage | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const message = data as { type?: unknown; payload?: unknown; data?: unknown };
  return typeof message.type === 'string'
    ? { ...message, type: message.type }
    : undefined;
}

/**
 * Create the message event handler for the App's window listener.
 */
export function createMessageHandler(
  injectPluginAssets: (params: InjectAssetsParams) => Promise<void>,
  pluginHost: WebviewPluginHost,
  resetPluginAssets?: ResetPluginAssets,
  updatePluginData: UpdatePluginData = () => undefined,
): (event: MessageEvent<unknown>) => void {
  const knownPluginIds = new Set<string>();
  return (event: MessageEvent<unknown>) => {
    const message = parseExtensionMessage(event.data);
    if (!message) return;
    routeExtensionMessage(message, {
      injectPluginAssets,
      knownPluginIds,
      pluginHost,
      resetPluginAssets,
      updatePluginData,
    });
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
