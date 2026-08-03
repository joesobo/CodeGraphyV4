import { matchesAnyPattern } from '../../discovery/pathMatching';
import type { CodeGraphyWorkspaceSettings } from '../../workspace/settings';

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
  const lifecyclePath = workspacePath === '.codegraphy/settings.json'
    || workspacePath.split('/').at(-1) === '.gitignore';
  return lifecyclePath || (
    !matchesAnyPattern(workspacePath, activeFilterPatterns)
    && !gitIgnoredPaths.has(workspacePath)
  );
}
