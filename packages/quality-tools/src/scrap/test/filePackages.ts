import { type QualityTarget } from '../../shared/resolve/target';
import { listWorkspacePackages } from '../../shared/util/workspacePackages';

export function packageNamesForTarget(target: QualityTarget, repoRoot: string): string[] {
  if (target.kind === 'repo') {
    return listWorkspacePackages(repoRoot).map((workspacePackage) => workspacePackage.name);
  }

  return target.packageName ? [target.packageName] : [];
}
