import * as vscode from 'vscode';
import {
  DEFAULT_EXCLUDE,
  matchesAnyPattern,
} from '../../core/discovery/pathMatching';

const WORKSPACE_REFRESH_IGNORE_PATTERNS = [
  '**/.codegraphy/**',
  '**/.vscode/settings.json',
  '**/.vscode/tasks.json',
  '**/.vscode/launch.json',
  '**/*.code-workspace',
  ...DEFAULT_EXCLUDE,
];

function normalizeWorkspacePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function shouldIgnoreWorkspaceRefreshPath(filePath: string): boolean {
  const normalized = normalizeWorkspacePath(filePath);
  return matchesAnyPattern(normalized, WORKSPACE_REFRESH_IGNORE_PATTERNS);
}

/**
 * Returns true when a saved document should not trigger graph re-analysis.
 * We skip workspace/config saves and discovery-excluded artifacts to avoid
 * graph resets from settings churn and non-analyzable file activity.
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
