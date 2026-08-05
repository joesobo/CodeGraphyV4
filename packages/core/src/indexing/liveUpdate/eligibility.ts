import { matchesAnyPattern, matchesPathOrAncestor } from '../../discovery/pathMatching';
import { isWorkspaceDiscoveryLifecyclePath } from '../../workspace/discoveryLifecycle';
import type { CodeGraphyWorkspaceSettings } from '../../workspace/settings';

export { isWorkspaceDiscoveryLifecyclePath } from '../../workspace/discoveryLifecycle';

export function createActiveWorkspaceFilterPatterns(
  settings: CodeGraphyWorkspaceSettings,
): string[] {
  const disabledPatterns = new Set(settings.disabledCustomFilterPatterns);
  return settings.filterPatterns.filter(pattern => !disabledPatterns.has(pattern));
}

export function isWorkspaceLiveUpdatePathEligible(
  workspacePath: string,
  activeFilterPatterns: readonly string[],
  gitIgnoredPaths: ReadonlySet<string> = new Set<string>(),
): boolean {
  return isWorkspaceDiscoveryLifecyclePath(workspacePath) || (
    !matchesAnyPattern(workspacePath, activeFilterPatterns)
    && !matchesPathOrAncestor(workspacePath, gitIgnoredPaths)
  );
}
