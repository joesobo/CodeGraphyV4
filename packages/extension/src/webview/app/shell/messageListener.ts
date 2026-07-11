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
import {
  webviewRenderReadyControl,
  type WebviewRenderReadyControl,
} from '../../perf/renderReady/control';
import { setGraphViewVisible } from '../../components/graph/runtime/physics/visibility';

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
  perfControl: Pick<
    WebviewGraphPerfControl,
    'handleControl' | 'handleExtensionMessage'
  > = webviewGraphPerfControl,
  renderReadyControl: Pick<
    WebviewRenderReadyControl,
    'graphDataReceived' | 'handleRequest'
  > = webviewRenderReadyControl,
): (event: MessageEvent<unknown>) => void {
  const packagePluginIdsByPackageName = new Map<string, string>();

  return (event: MessageEvent<unknown>) => {
    const raw = event.data as {
      data?: unknown;
      graphRevision?: unknown;
      payload?: unknown;
      type?: unknown;
    };
    if (!raw || typeof raw !== 'object' || typeof raw.type !== 'string') {
      return;
    }
    if (
      raw.type === 'PERF_RENDER_READY_REQUEST'
      && renderReadyControl.handleRequest(raw)
    ) {
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

    if (
      raw.type === 'GRAPH_VIEW_VISIBILITY_UPDATED'
      && typeof (raw.payload as { visible?: unknown } | undefined)?.visible === 'boolean'
    ) {
      setGraphViewVisible((raw.payload as { visible: boolean }).visible);
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
    if (raw.type === 'GRAPH_DATA_UPDATED' || raw.type === 'GRAPH_DATA_PATCHED') {
      renderReadyControl.graphDataReceived(
        typeof raw.graphRevision === 'number'
          && Number.isSafeInteger(raw.graphRevision)
          && raw.graphRevision >= 0
          ? raw.graphRevision
          : undefined,
      );
    }
    graphStore.getState().handleExtensionMessage(raw as ExtensionToWebviewMessage);
    if (raw.type === 'GRAPH_CONTROLS_UPDATED') {
      perfControl.handleExtensionMessage(raw);
    }
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
