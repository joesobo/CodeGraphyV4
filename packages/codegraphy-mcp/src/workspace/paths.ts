import * as path from 'node:path';

export function resolveCodeGraphyWorkspacePath(
  workspacePath: string | undefined,
  cwd: string = process.cwd(),
): string {
  return path.resolve(cwd, workspacePath ?? '.');
}
