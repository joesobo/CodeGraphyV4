import type * as vscode from 'vscode';
import type { CodeGraphyWebviewKind } from '../../webview/html';
import type { GraphViewProviderWebviewMethodDependencies } from './defaultDependencies';
import type { GraphViewProviderSidebarViewSource } from './sidebarViews';

export interface GraphViewProviderWebviewResolveSource extends GraphViewProviderSidebarViewSource {
  _extensionUri: vscode.Uri;
  _searchViewCompacted?: boolean;
  _getLocalResourceRoots(): vscode.Uri[];
  flushPendingWorkspaceRefresh?(): void;
}

const SEARCH_VIEW_DECREASE_STEPS = 24;

function isSearchWebviewView(webviewView: vscode.WebviewView): boolean {
  return webviewView.viewType === 'codegraphy.searchView';
}

function isTimelineWebviewView(webviewView: vscode.WebviewView): boolean {
  return webviewView.viewType === 'codegraphy.timelineView';
}

function getWebviewKind(webviewView: vscode.WebviewView): CodeGraphyWebviewKind {
  if (isSearchWebviewView(webviewView)) {
    return 'search';
  }

  if (isTimelineWebviewView(webviewView)) {
    return 'timeline';
  }

  return 'graph';
}

function assignResolvedWebviewView(
  source: GraphViewProviderWebviewResolveSource,
  webviewView: vscode.WebviewView,
  viewKind: CodeGraphyWebviewKind,
  workspaceTitle: string | undefined,
): void {
  if (viewKind === 'search') {
    source._searchView = webviewView;
    return;
  }

  if (viewKind === 'timeline') {
    source._timelineView = webviewView;
    return;
  }

  webviewView.title = workspaceTitle ?? 'Graph';
  source._view = webviewView;
}

function clearResolvedWebviewView(
  source: GraphViewProviderWebviewResolveSource,
  webviewView: vscode.WebviewView,
  viewKind: CodeGraphyWebviewKind,
): void {
  if (viewKind === 'search' && source._searchView === webviewView) {
    source._searchView = undefined;
  }

  if (viewKind === 'timeline' && source._timelineView === webviewView) {
    source._timelineView = undefined;
  }

  if (viewKind === 'graph' && source._view === webviewView) {
    source._view = undefined;
  }
}

function maybeFlushPendingWorkspaceRefresh(
  source: GraphViewProviderWebviewResolveSource,
  webviewView: vscode.WebviewView,
  viewKind: CodeGraphyWebviewKind,
): void {
  if (viewKind === 'graph' && webviewView.visible) {
    source.flushPendingWorkspaceRefresh?.();
  }
}

function compactSearchView(
  source: GraphViewProviderWebviewResolveSource,
  dependencies: Pick<GraphViewProviderWebviewMethodDependencies, 'executeCommand'>,
  viewKind: CodeGraphyWebviewKind,
): void {
  if (viewKind !== 'search' || source._searchViewCompacted) {
    return;
  }

  source._searchViewCompacted = true;
  void (async () => {
    await dependencies.executeCommand('workbench.action.openView', 'codegraphy.searchView');
    await dependencies.executeCommand('workbench.action.focusSideBar');
    for (let index = 0; index < SEARCH_VIEW_DECREASE_STEPS; index += 1) {
      await dependencies.executeCommand('workbench.action.decreaseViewSize');
    }
    await dependencies.executeCommand('workbench.action.openView', 'codegraphy.graphView');
  })().catch(() => undefined);
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

  compactSearchView(source, dependencies, viewKind);
  maybeFlushPendingWorkspaceRefresh(source, webviewView, viewKind);
}
