import { relative, sep } from 'node:path';
import type { Event as ParcelWatcherEvent } from '@parcel/watcher';
import { collectGitIgnoredPathsFromGit } from '../../../discovery/file/service';
import { readCodeGraphyWorkspaceSettings } from '../../../workspace/settings';
import {
  createActiveWorkspaceFilterPatterns,
  isWorkspaceLiveUpdatePathEligible,
} from '../eligibility';

export function toWorkspacePath(workspaceRoot: string, filePath: string): string {
  return relative(workspaceRoot, filePath).split(sep).join('/');
}

export function filterEligibleWorkspaceEvents(
  workspaceRoot: string,
  events: readonly ParcelWatcherEvent[],
): ParcelWatcherEvent[] {
  const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);
  const activeFilterPatterns = createActiveWorkspaceFilterPatterns(settings);
  const eventsByWorkspacePath = events.map(event => ({
    event,
    workspacePath: toWorkspacePath(workspaceRoot, event.path),
  }));
  const gitIgnoredPaths = settings.respectGitignore
    ? collectGitIgnoredPathsFromGit(
      workspaceRoot,
      eventsByWorkspacePath.map(({ workspacePath }) => workspacePath),
    ) ?? new Set<string>()
    : new Set<string>();

  return eventsByWorkspacePath
    .filter(({ workspacePath }) => isWorkspaceLiveUpdatePathEligible(
      workspacePath,
      activeFilterPatterns,
      gitIgnoredPaths,
    ))
    .map(({ event }) => event);
}
