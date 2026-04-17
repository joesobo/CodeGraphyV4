import type * as vscode from 'vscode';

export function isGraphViewVisible(
  view: vscode.WebviewView | undefined,
  panels: readonly vscode.WebviewPanel[],
): boolean {
  if (view?.visible) {
    return true;
  }

  return panels.some((panel) => panel.visible);
}
