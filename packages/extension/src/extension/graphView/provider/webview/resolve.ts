import type * as vscode from 'vscode';
import type { GraphViewProviderWebviewMethodDependencies } from './defaultDependencies';
import type { GraphViewProviderSidebarViewSource } from './sidebarViews';

export interface GraphViewProviderWebviewResolveSource extends GraphViewProviderSidebarViewSource {
  _extensionUri: vscode.Uri;
  _getLocalResourceRoots(): vscode.Uri[];
  flushPendingWorkspaceRefresh?(): void;
}

function isTimelineWebviewView(webviewView: vscode.WebviewView): boolean {
  return webviewView.viewType === 'codegraphy.timelineView';
}

function assignResolvedWebviewView(
  source: GraphViewProviderWebviewResolveSource,
  webviewView: vscode.WebviewView,
  isTimelineView: boolean,
): void {
  if (isTimelineView) {
    source._timelineView = webviewView;
    return;
  }

  source._view = webviewView;
}

function clearResolvedWebviewView(
  source: GraphViewProviderWebviewResolveSource,
  webviewView: vscode.WebviewView,
  isTimelineView: boolean,
): void {
  if (isTimelineView && source._timelineView === webviewView) {
    source._timelineView = undefined;
  }

  if (!isTimelineView && source._view === webviewView) {
    source._view = undefined;
  }
}

function maybeFlushPendingWorkspaceRefresh(
  source: GraphViewProviderWebviewResolveSource,
  webviewView: vscode.WebviewView,
  isTimelineView: boolean,
): void {
  if (!isTimelineView && webviewView.visible) {
    source.flushPendingWorkspaceRefresh?.();
  }
}

export function resolveGraphViewProviderWebviewView(
  source: GraphViewProviderWebviewResolveSource,
  dependencies: Pick<
    GraphViewProviderWebviewMethodDependencies,
    'createHtml' | 'executeCommand' | 'resolveWebviewView' | 'setWebviewMessageListener'
  >,
  webviewView: vscode.WebviewView,
): void {
  const isTimelineView = isTimelineWebviewView(webviewView);
  assignResolvedWebviewView(source, webviewView, isTimelineView);

  webviewView.onDidDispose(() => {
    clearResolvedWebviewView(source, webviewView, isTimelineView);
  });

  webviewView.onDidChangeVisibility(() => {
    maybeFlushPendingWorkspaceRefresh(source, webviewView, isTimelineView);
  });

  dependencies.resolveWebviewView(webviewView, {
    getLocalResourceRoots: () => source._getLocalResourceRoots(),
    setWebviewMessageListener: (nextWebview: vscode.Webview) =>
      dependencies.setWebviewMessageListener(nextWebview as never, source as never),
    getHtml: (nextWebview: vscode.Webview) =>
      dependencies.createHtml(
        source._extensionUri,
        nextWebview,
        isTimelineView ? 'timeline' : 'graph',
      ),
    executeCommand: (command: string, key: string, value: boolean) =>
      dependencies.executeCommand(command, key, value),
  } as never);

  maybeFlushPendingWorkspaceRefresh(source, webviewView, isTimelineView);
}
