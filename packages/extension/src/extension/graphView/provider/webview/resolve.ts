import type * as vscode from 'vscode';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { GraphViewProviderWebviewMethodDependencies } from './defaultDependencies';
import type { GraphViewProviderSidebarViewSource } from './sidebarViews';
import {
  assignResolvedWebviewView,
  clearResolvedWebviewView,
  getWebviewKind,
  maybeFlushPendingWorkspaceRefresh,
} from './resolve/views';

export interface GraphViewProviderWebviewResolveSource extends GraphViewProviderSidebarViewSource {
  _extensionUri: vscode.Uri;
  _analysisController?: AbortController;
  _graphData?: IGraphData;
  _webviewReadyNotified?: boolean;
  _getLocalResourceRoots(): vscode.Uri[];
  _loadAndSendData?(): Promise<void>;
  flushPendingWorkspaceRefresh?(): void;
}

function shouldRequestInitialGraphData(
  source: GraphViewProviderWebviewResolveSource,
): boolean {
  return source._loadAndSendData !== undefined
    && !source._webviewReadyNotified
    && source._analysisController === undefined
    && (source._graphData?.nodes.length ?? 0) === 0
    && (source._graphData?.edges.length ?? 0) === 0;
}

function requestInitialGraphDataAfterResolve(
  source: GraphViewProviderWebviewResolveSource,
): void {
  setTimeout(() => {
    if (!shouldRequestInitialGraphData(source)) {
      return;
    }

    void source._loadAndSendData?.().catch(error => {
      console.warn('[CodeGraphy] Failed to load graph data after resolving graph view.', error);
    });
  }, 0);
}

export function resolveGraphViewProviderWebviewView(
  source: GraphViewProviderWebviewResolveSource,
  dependencies: Pick<
    GraphViewProviderWebviewMethodDependencies,
    'createHtml' | 'executeCommand' | 'getWorkspaceTitle' | 'resolveWebviewView' | 'setWebviewMessageListener'
  >,
  webviewView: vscode.WebviewView,
): void {
  const viewKind = getWebviewKind(webviewView);
  assignResolvedWebviewView(
    source,
    webviewView,
    viewKind,
    dependencies.getWorkspaceTitle?.(),
  );

  webviewView.onDidDispose(() => {
    clearResolvedWebviewView(source, webviewView, viewKind);
  });

  webviewView.onDidChangeVisibility(() => {
    maybeFlushPendingWorkspaceRefresh(source, webviewView, viewKind);
  });

  dependencies.resolveWebviewView(webviewView, {
    getLocalResourceRoots: () => source._getLocalResourceRoots(),
    setWebviewMessageListener: (nextWebview: vscode.Webview) =>
      dependencies.setWebviewMessageListener(nextWebview as never, source as never),
    getHtml: (nextWebview: vscode.Webview) =>
      dependencies.createHtml(
        source._extensionUri,
        nextWebview,
        viewKind,
      ),
    executeCommand: (command: string, key: string, value: boolean) =>
      dependencies.executeCommand(command, key, value),
  } as never);
  if (viewKind === 'graph') {
    requestInitialGraphDataAfterResolve(source);
  }
  maybeFlushPendingWorkspaceRefresh(source, webviewView, viewKind);
}
