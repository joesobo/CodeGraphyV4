import type * as vscode from 'vscode';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { IGroup } from '../../../../shared/settings/groups';
import {
  dispatchGraphViewPluginMessage,
  type GraphViewPluginMessageContext,
} from '../dispatch/plugin';
import {
  dispatchGraphViewPrimaryMessage,
  type GraphViewPrimaryMessageContext,
} from '../dispatch/primary';
import { replayDuplicateWebviewReady } from './ready';

export interface GraphViewMessageListenerContext
  extends GraphViewPrimaryMessageContext,
    GraphViewPluginMessageContext {
  reprocessPluginFiles(pluginIds: readonly string[]): Promise<void>;
  setUserGroups(groups: IGroup[]): void;
  setFilterPatterns(patterns: string[]): void;
  setWebviewReadyNotified(nextValue: boolean): void;
}

const webviewMessageListenerDisposables = new WeakMap<vscode.Webview, vscode.Disposable>();

type GraphViewPrimaryMessageResult = Awaited<ReturnType<typeof dispatchGraphViewPrimaryMessage>>;
type GraphViewPluginMessageResult = Awaited<ReturnType<typeof dispatchGraphViewPluginMessage>>;
type WebviewReadyMessage = Extract<WebviewToExtensionMessage, { type: 'WEBVIEW_READY' }>;

interface WebviewReadyDelivery {
  pageId?: string;
  postedAt?: number;
}

function getWebviewReadyDelivery(message: WebviewReadyMessage): WebviewReadyDelivery {
  const payload = (message as { payload?: unknown }).payload;
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const pageId = (payload as { pageId?: unknown }).pageId;
  const postedAt = (payload as { postedAt?: unknown }).postedAt;
  return {
    ...(typeof pageId === 'string' && pageId.length > 0 ? { pageId } : {}),
    ...(typeof postedAt === 'number' && Number.isFinite(postedAt) ? { postedAt } : {}),
  };
}

function applyGraphViewPrimaryMessageResult(
  primaryResult: GraphViewPrimaryMessageResult,
  context: GraphViewMessageListenerContext,
): boolean {
  if (!primaryResult.handled) {
    return false;
  }

  if (primaryResult.userGroups !== undefined) {
    context.setUserGroups(primaryResult.userGroups);
    context.recomputeGroups();
    context.sendGroupsUpdated();
  }
  if (primaryResult.filterPatterns !== undefined) {
    context.setFilterPatterns(primaryResult.filterPatterns);
  }

  return true;
}

function applyGraphViewPluginMessageResult(
  pluginResult: GraphViewPluginMessageResult,
  context: GraphViewMessageListenerContext,
): void {
  if (pluginResult.handled && pluginResult.readyNotified !== undefined) {
    context.setWebviewReadyNotified(pluginResult.readyNotified);
  }
}

function createReadyState(context: GraphViewMessageListenerContext) {
  return {
    maxFiles: context.getMaxFiles(),
    verboseDiagnostics: context.getConfig('verboseDiagnostics', false),
    playbackSpeed: context.getPlaybackSpeed(),
    depthMode: context.getDepthMode?.() ?? false,
    dagMode: context.getDagMode(),
    nodeSizeMode: context.getNodeSizeMode(),
    focusedFile: context.getFocusedFile(),
    hasWorkspace: context.hasWorkspace(),
    firstAnalysis: context.isFirstAnalysis(),
    readyNotified: context.isWebviewReadyNotified(),
  };
}

function createGraphViewWebviewMessageHandler(
  webview: vscode.Webview,
  context: GraphViewMessageListenerContext,
): (message: WebviewToExtensionMessage) => Promise<void> {
  let webviewReadyHandled = false;
  let webviewReadyPageId: string | undefined;
  let webviewReadyCompletedAt: number | undefined;

  return async function handleGraphViewWebviewMessage(message: WebviewToExtensionMessage): Promise<void> {
    const isWebviewReadyMessage = message.type === 'WEBVIEW_READY';
    if (message.type === 'WEBVIEW_READY') {
      const delivery = getWebviewReadyDelivery(message);
      if (webviewReadyHandled) {
        const isSamePage = delivery.pageId !== undefined && delivery.pageId === webviewReadyPageId;
        const wasPostedBeforeCompletedBootstrap = delivery.postedAt !== undefined
          && webviewReadyCompletedAt !== undefined
          && delivery.postedAt <= webviewReadyCompletedAt;
        if (isSamePage || wasPostedBeforeCompletedBootstrap) {
          return;
        }
        webviewReadyPageId = delivery.pageId;
        await replayDuplicateWebviewReady(createReadyState(context), context);
        return;
      }
      webviewReadyHandled = true;
      webviewReadyPageId = delivery.pageId;
    }

    const primaryResult = await dispatchGraphViewPrimaryMessage(message, {
      ...context,
      asWebviewUri: uri => webview.asWebviewUri(uri),
    });
    if (applyGraphViewPrimaryMessageResult(primaryResult, context)) {
      if (isWebviewReadyMessage) {
        webviewReadyCompletedAt = Date.now();
      }
      return;
    }

    const pluginResult = await dispatchGraphViewPluginMessage(message, context);
    applyGraphViewPluginMessageResult(pluginResult, context);
    if (isWebviewReadyMessage && pluginResult.handled) {
      webviewReadyCompletedAt = Date.now();
    }
  };
}

export function setGraphViewWebviewMessageListener(
  webview: vscode.Webview,
  context: GraphViewMessageListenerContext,
): void {
  webviewMessageListenerDisposables.get(webview)?.dispose();
  const listenerDisposable = webview.onDidReceiveMessage(
    createGraphViewWebviewMessageHandler(webview, context),
  );
  webviewMessageListenerDisposables.set(webview, listenerDisposable);
}
