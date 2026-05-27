import * as path from 'node:path';
import type { PluginsCommandDependencies } from './dependencies';

export function resolveWorkspaceRoot(
  workspacePath: string | undefined,
  dependencies: Pick<PluginsCommandDependencies, 'cwd'>,
): string {
  return path.resolve(dependencies.cwd(), workspacePath ?? '.');
}
