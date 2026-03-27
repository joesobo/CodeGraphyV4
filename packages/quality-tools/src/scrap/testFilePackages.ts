import { type QualityTarget } from '../shared/resolveTarget';
import { listWorkspacePackages } from '../shared/workspacePackages';

export function packageNamesForTarget(target: QualityTarget, repoRoot: string): string[] {
  if (target.kind === 'repo') {
    return listWorkspacePackages(repoRoot).map((workspacePackage) => workspacePackage.name);
  }

  return target.packageName ? [target.packageName] : [];
}
