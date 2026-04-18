import { join } from 'path';
import { pathIncludedByTool, resolvePackageBoundaryConfig } from '../config/quality';
import { walkDirectories } from '../organize/metric/directoryWalk';
import { toPosix } from '../shared/util/pathUtils';
import type { WorkspacePackage } from '../shared/util/workspacePackages';

function isBoundaryEntrypoint(repoRoot: string, packageName: string, packageRelativePath: string): boolean {
  const { entrypoints } = resolvePackageBoundaryConfig(repoRoot, packageName);
  return entrypoints.includes(packageRelativePath);
}

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
        isBoundaryEntrypoint(repoRoot, workspacePackage.name, packageRelativePath) ||
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
