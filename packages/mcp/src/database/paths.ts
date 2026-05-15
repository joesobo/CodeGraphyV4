import * as path from 'node:path';

const DATABASE_DIRECTORY_NAME = '.codegraphy';
const DATABASE_FILE_NAME = 'graph.lbug';
const SETTINGS_FILE_NAME = 'settings.json';

export function resolveWorkspaceRoot(workspaceRoot: string): string {
  return path.resolve(workspaceRoot);
}

export function getWorkspaceDatabasePath(workspaceRoot: string): string {
  return path.join(resolveWorkspaceRoot(workspaceRoot), DATABASE_DIRECTORY_NAME, DATABASE_FILE_NAME);
}

export function getWorkspaceSettingsPath(workspaceRoot: string): string {
  return path.join(resolveWorkspaceRoot(workspaceRoot), DATABASE_DIRECTORY_NAME, SETTINGS_FILE_NAME);
}

export function toRepoRelativeFilePath(filePath: string, workspaceRoot: string): string {
  if (!path.isAbsolute(filePath)) {
    return filePath.replaceAll('\\', '/');
  }

  const relativePath = path.relative(resolveWorkspaceRoot(workspaceRoot), filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return filePath.replaceAll('\\', '/');
  }

  return relativePath.replaceAll('\\', '/');
}
