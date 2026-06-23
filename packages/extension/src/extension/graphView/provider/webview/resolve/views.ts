import type * as vscode from 'vscode';
import type { CodeGraphyWebviewKind } from '../../../webview/html';
import type { GraphViewProviderWebviewResolveSource } from '../resolve';

export function getWebviewKind(webviewView: vscode.WebviewView): CodeGraphyWebviewKind {
  return isTimelineWebviewView(webviewView) ? 'timeline' : 'graph';
}

export function assignResolvedWebviewView(
  source: GraphViewProviderWebviewResolveSource,
  webviewView: vscode.WebviewView,
  viewKind: CodeGraphyWebviewKind,
  workspaceTitle: string | undefined,
): void {
  if (viewKind === 'timeline') {
    source._timelineView = webviewView;
    return;
  }

  webviewView.title = workspaceTitle ?? 'Graph';
  source._view = webviewView;
}

export function clearResolvedWebviewView(
  source: GraphViewProviderWebviewResolveSource,
  webviewView: vscode.WebviewView,
  viewKind: CodeGraphyWebviewKind,
): void {
  if (viewKind === 'timeline' && source._timelineView === webviewView) {
    source._timelineView = undefined;
  }

  if (viewKind === 'graph' && source._view === webviewView) {
    source._view = undefined;
  }
}

export function maybeFlushPendingWorkspaceRefresh(
  source: GraphViewProviderWebviewResolveSource,
  webviewView: vscode.WebviewView,
  viewKind: CodeGraphyWebviewKind,
): void {
  if (viewKind === 'graph' && webviewView.visible) {
    source.flushPendingWorkspaceRefresh?.();
  }
}

function isTimelineWebviewView(webviewView: vscode.WebviewView): boolean {
  return webviewView.viewType === 'codegraphy.timelineView';
}
