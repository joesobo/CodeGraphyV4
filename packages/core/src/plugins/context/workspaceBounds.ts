import * as path from 'node:path';

export function isWithinWorkspace(workspaceRoot: string, filePath: string): boolean {
  const relativePath = path.relative(workspaceRoot, filePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}
