import { existsSync, statSync } from 'fs';
import { isAbsolute, resolve } from 'path';

export function resolveExistingPath(repoRoot: string, input?: string): string {
  if (!input) {
    return repoRoot;
  }

  const candidates = [
    isAbsolute(input) ? input : resolve(repoRoot, input),
    resolve(repoRoot, 'packages', input)
  ];

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`Target not found: ${input}`);
  }

  return found;
}

export function pathKind(absolutePath: string): 'directory' | 'file' {
  return statSync(absolutePath).isDirectory() ? 'directory' : 'file';
}
