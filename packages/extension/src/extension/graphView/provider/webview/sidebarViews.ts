import type * as vscode from 'vscode';

export interface GraphViewProviderSidebarViewSource {
  _view?: vscode.WebviewView;
}

export function getGraphViewProviderSidebarViews(
  source: GraphViewProviderSidebarViewSource,
): vscode.WebviewView[] {
  return [source._view].filter(
    (view): view is vscode.WebviewView => view !== undefined,
  );
}

