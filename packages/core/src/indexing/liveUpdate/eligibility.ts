import { matchesAnyPattern } from '../../discovery/pathMatching';
import type { CodeGraphyWorkspaceSettings } from '../../workspace/settings';

export function createActiveWorkspaceFilterPatterns(
  settings: CodeGraphyWorkspaceSettings,
): string[] {
  const disabledPatterns = new Set(settings.disabledCustomFilterPatterns);
  return settings.filterPatterns.filter(pattern => !disabledPatterns.has(pattern));
}

export function isWorkspaceDiscoveryLifecyclePath(workspacePath: string): boolean {
  return workspacePath === '.codegraphy/settings.json'
    || workspacePath === '.git/index'
    || workspacePath === '.git/info/exclude'
    || workspacePath.split('/').at(-1) === '.gitignore';
}

export function isWorkspaceLiveUpdatePathEligible(
  workspacePath: string,
  activeFilterPatterns: readonly string[],
  gitIgnoredPaths: ReadonlySet<string> = new Set<string>(),
): boolean {
  return isWorkspaceDiscoveryLifecyclePath(workspacePath) || (
    !matchesAnyPattern(workspacePath, activeFilterPatterns)
    && !gitIgnoredPaths.has(workspacePath)
  );
}
