import * as path from 'path';

function usesWindowsAbsolutePath(filePath: string, workspaceRoot: string): boolean {
  return path.win32.isAbsolute(filePath) && path.win32.isAbsolute(workspaceRoot);
}

export function toRepoRelativeGraphPath(filePath: string, workspaceRoot: string): string {
  const relativePath = usesWindowsAbsolutePath(filePath, workspaceRoot)
    ? path.win32.relative(workspaceRoot, filePath)
    : path.isAbsolute(filePath)
      ? path.relative(workspaceRoot, filePath)
      : filePath;

  return relativePath.replace(/\\/g, '/');
}

export function normalizeSymbolKind(kind: string): string {
  return kind.trim().toLowerCase();
}
