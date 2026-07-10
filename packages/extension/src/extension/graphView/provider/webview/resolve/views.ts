import type * as vscode from 'vscode';
import type { CodeGraphyWebviewKind } from '../../../webview/html';
import type { GraphViewProviderWebviewResolveSource } from '../resolve';

export function getWebviewKind(_webviewView: vscode.WebviewView): CodeGraphyWebviewKind {
  return 'graph';
}

export function assignResolvedWebviewView(
  source: GraphViewProviderWebviewResolveSource,
  webviewView: vscode.WebviewView,
  _viewKind: CodeGraphyWebviewKind,
  workspaceTitle: string | undefined,
): void {
  webviewView.title = workspaceTitle ?? 'Graph';
  source._view = webviewView;
}

export function clearResolvedWebviewView(
  source: GraphViewProviderWebviewResolveSource,
  webviewView: vscode.WebviewView,
  _viewKind: CodeGraphyWebviewKind,
): void {
  if (source._view === webviewView) source._view = undefined;
}

export function maybeFlushPendingWorkspaceRefresh(
  source: GraphViewProviderWebviewResolveSource,
  webviewView: vscode.WebviewView,
  _viewKind: CodeGraphyWebviewKind,
): void {
  if (webviewView.visible) source.flushPendingWorkspaceRefresh?.();
}
