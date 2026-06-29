import type * as vscode from 'vscode';
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
  _getLocalResourceRoots(): vscode.Uri[];
  flushPendingWorkspaceRefresh?(): void;
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
      dependencies.setWebviewMessageListener(nextWebview as never, source as never, viewKind),
    getHtml: (nextWebview: vscode.Webview) =>
      dependencies.createHtml(
        source._extensionUri,
        nextWebview,
        viewKind,
      ),
    executeCommand: (command: string, key: string, value: boolean) =>
      dependencies.executeCommand(command, key, value),
  } as never);
  maybeFlushPendingWorkspaceRefresh(source, webviewView, viewKind);
}
