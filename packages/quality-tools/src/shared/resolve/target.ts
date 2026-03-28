import { relativeTo } from '../util/pathUtils';
import { findContainingPackage } from '../util/packageTarget';
import { pathKind, resolveExistingPath } from './path';
import { listWorkspacePackages } from '../util/workspacePackages';

export type QualityTargetKind = 'repo' | 'package' | 'directory' | 'file';

export interface QualityTarget {
  absolutePath: string;
  kind: QualityTargetKind;
  relativePath: string;
  packageName?: string;
  packageRelativePath?: string;
  packageRoot?: string;
}

export function resolveQualityTarget(repoRoot: string, input?: string): QualityTarget {
  const workspacePackages = listWorkspacePackages(repoRoot);
  const absolutePath = resolveExistingPath(repoRoot, input);

  if (absolutePath === repoRoot) {
    return {
      absolutePath,
      kind: 'repo',
      relativePath: '.'
    };
  }

  const workspacePackage = findContainingPackage(absolutePath, workspacePackages);
  const relativePath = relativeTo(repoRoot, absolutePath);
  const kind = pathKind(absolutePath);

  if (!workspacePackage) {
    return {
      absolutePath,
      kind,
      relativePath
    };
  }

  if (absolutePath === workspacePackage.root) {
    return {
      absolutePath,
      kind: 'package',
      relativePath,
      packageName: workspacePackage.name,
      packageRelativePath: '.',
      packageRoot: workspacePackage.root
    };
  }

  return {
    absolutePath,
    kind,
    relativePath,
    packageName: workspacePackage.name,
    packageRelativePath: relativeTo(workspacePackage.root, absolutePath),
    packageRoot: workspacePackage.root
  };
}
