import * as path from 'node:path';

const CODEGRAPHY_DIRECTORY_NAME = '.codegraphy';
const GRAPH_CACHE_FILE_NAME = 'graph.sqlite';
const WORKSPACE_SETTINGS_FILE_NAME = 'settings.json';
const WORKSPACE_META_FILE_NAME = 'meta.json';

export function resolveWorkspaceRoot(workspaceRoot: string): string {
  return path.resolve(workspaceRoot);
}

export function getCodeGraphyDirectoryPath(workspaceRoot: string): string {
  return path.join(resolveWorkspaceRoot(workspaceRoot), CODEGRAPHY_DIRECTORY_NAME);
}

export function getGraphCachePath(workspaceRoot: string): string {
  return path.join(getCodeGraphyDirectoryPath(workspaceRoot), GRAPH_CACHE_FILE_NAME);
}

export function getWorkspaceSettingsPath(workspaceRoot: string): string {
  return path.join(getCodeGraphyDirectoryPath(workspaceRoot), WORKSPACE_SETTINGS_FILE_NAME);
}

export function getWorkspaceMetaPath(workspaceRoot: string): string {
  return path.join(getCodeGraphyDirectoryPath(workspaceRoot), WORKSPACE_META_FILE_NAME);
}
