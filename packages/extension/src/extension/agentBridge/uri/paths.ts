import * as path from 'node:path';

export function normalizeAgentRepoPath(
  fsPath: string,
  platform: NodeJS.Platform = process.platform,
): string {
  const resolvedPath = path.resolve(fsPath);
  return platform === 'win32' ? resolvedPath.toLowerCase() : resolvedPath;
}
