import type * as vscode from 'vscode';
import type { GraphViewProviderWebviewResolveSource } from '../resolve';

export function assignResolvedWebviewView(
  source: GraphViewProviderWebviewResolveSource,
  webviewView: vscode.WebviewView,
  workspaceTitle: string | undefined,
): void {
  webviewView.title = workspaceTitle ?? 'Graph';
  source._view = webviewView;
}

export function clearResolvedWebviewView(
  source: GraphViewProviderWebviewResolveSource,
  webviewView: vscode.WebviewView,
): void {
  if (source._view === webviewView) source._view = undefined;
}

export function maybeFlushPendingWorkspaceRefresh(
  source: GraphViewProviderWebviewResolveSource,
  webviewView: vscode.WebviewView,
): void {
  if (webviewView.visible) source.flushPendingWorkspaceRefresh?.();
}
