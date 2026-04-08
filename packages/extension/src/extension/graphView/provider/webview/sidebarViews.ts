import type * as vscode from 'vscode';

export interface GraphViewProviderSidebarViewSource {
  _view?: vscode.WebviewView;
  _timelineView?: vscode.WebviewView;
}

export function getGraphViewProviderSidebarViews(
  source: GraphViewProviderSidebarViewSource,
): vscode.WebviewView[] {
  return [source._view, source._timelineView].filter(
    (view): view is vscode.WebviewView => view !== undefined,
  );
}

