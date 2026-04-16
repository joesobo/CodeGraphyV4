import * as path from 'node:path';

export function isWithinRoot(candidatePath: string, rootPath: string): boolean {
  const relativePath = path.relative(rootPath, candidatePath);
  if (relativePath === '') {
    return true;
  }

  return relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

export function shouldStopProjectRootWalk(
  parentPath: string,
  workspaceRoot: string,
): boolean {
  return !isWithinRoot(parentPath, workspaceRoot);
}
