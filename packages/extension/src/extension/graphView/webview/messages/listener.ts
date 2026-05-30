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
import { replayWebviewReadySettings } from './ready';

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

  return async function handleGraphViewWebviewMessage(message: WebviewToExtensionMessage): Promise<void> {
    if (message.type === 'WEBVIEW_READY' && webviewReadyHandled) {
      replayWebviewReadySettings(createReadyState(context), context);
      return;
    }
    webviewReadyHandled ||= message.type === 'WEBVIEW_READY';

    const primaryResult = await dispatchGraphViewPrimaryMessage(message, {
      ...context,
      asWebviewUri: uri => webview.asWebviewUri(uri),
    });
    if (applyGraphViewPrimaryMessageResult(primaryResult, context)) {
      return;
    }

    applyGraphViewPluginMessageResult(
      await dispatchGraphViewPluginMessage(message, context),
      context,
    );
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
