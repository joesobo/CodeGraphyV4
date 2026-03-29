import * as vscode from 'vscode';

/**
 * Returns true when a saved document should not trigger graph re-analysis.
 * We skip workspace/config saves to avoid graph resets while changing settings.
 */
export function shouldIgnoreSaveForGraphRefresh(document: vscode.TextDocument): boolean {
  const filePath = document.uri?.fsPath;
  if (!filePath) return false;

  const normalized = filePath.replace(/\\/g, '/');
  return (
    normalized.endsWith('/.vscode/settings.json') ||
    normalized.endsWith('/.vscode/tasks.json') ||
    normalized.endsWith('/.vscode/launch.json') ||
    normalized.endsWith('.code-workspace')
  );
}
