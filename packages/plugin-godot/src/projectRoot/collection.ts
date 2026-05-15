import * as path from 'node:path';
import { normalizePath } from '../parser';

export function collectGodotProjectRoots(relativePaths: readonly string[]): Set<string> {
  return new Set(relativePaths.flatMap((relativePath) => {
    if (path.basename(relativePath) !== 'project.godot') {
      return [];
    }

    const projectRoot = normalizePath(path.dirname(relativePath));
    return [projectRoot === '.' ? '' : projectRoot];
  }));
}
