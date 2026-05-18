import * as path from 'path';

export function toRepoRelativeGraphPath(filePath: string, workspaceRoot: string): string {
  const relativePath = path.isAbsolute(filePath)
    ? path.relative(workspaceRoot, filePath)
    : filePath;

  return relativePath.replace(/\\/g, '/');
}

export function normalizeSymbolKind(kind: string): string {
  return kind.trim().toLowerCase();
}
