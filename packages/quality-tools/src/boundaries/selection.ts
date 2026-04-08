import { join } from 'path';
import { pathIncludedByTool } from '../config/quality';
import { walkDirectories } from '../organize/metric/directoryWalk';
import { toPosix } from '../shared/util/pathUtils';
import type { WorkspacePackage } from '../shared/util/workspacePackages';

export function resolvePackageCandidates(
  repoRoot: string,
  workspacePackage: WorkspacePackage
): string[] {
  const entries = walkDirectories(workspacePackage.root);
  const selected: string[] = [];

  for (const entry of entries) {
    for (const fileName of entry.files) {
      const absolutePath = join(entry.directoryPath, fileName);
      const packageRelativePath = toPosix(absolutePath.slice(workspacePackage.root.length + 1));
      if (
        pathIncludedByTool(
          repoRoot,
          workspacePackage.name,
          'boundaries',
          packageRelativePath
        )
      ) {
        selected.push(absolutePath);
      }
    }
  }

  return selected.sort();
}
