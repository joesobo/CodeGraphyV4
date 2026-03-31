import * as vscode from 'vscode';

function normalizeWorkspacePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function shouldIgnoreWorkspaceRefreshPath(filePath: string): boolean {
  const normalized = normalizeWorkspacePath(filePath);

  return (
    normalized.endsWith('/.vscode/settings.json') ||
    normalized.endsWith('/.vscode/tasks.json') ||
    normalized.endsWith('/.vscode/launch.json') ||
    normalized.endsWith('.code-workspace') ||
    normalized.includes('/node_modules/') ||
    normalized.includes('/dist/') ||
    normalized.includes('/build/') ||
    normalized.includes('/out/') ||
    normalized.includes('/coverage/') ||
    normalized.includes('/.git/') ||
    normalized.endsWith('.min.js') ||
    normalized.endsWith('.bundle.js') ||
    normalized.endsWith('.map')
  );
}

/**
 * Returns true when a saved document should not trigger graph re-analysis.
 * We skip workspace/config saves to avoid graph resets while changing settings.
 */
export function shouldIgnoreSaveForGraphRefresh(document: vscode.TextDocument): boolean {
  const filePath = document.uri?.fsPath;
  if (!filePath) return false;

  return shouldIgnoreWorkspaceRefreshPath(filePath);
}

/**
 * Returns true when a workspace file watcher event should not trigger graph re-analysis.
 * This skips discovery-excluded and workspace artifact paths that are expected to churn.
 */
export function shouldIgnoreWorkspaceFileWatcherRefresh(filePath: string): boolean {
  return shouldIgnoreWorkspaceRefreshPath(filePath);
}
