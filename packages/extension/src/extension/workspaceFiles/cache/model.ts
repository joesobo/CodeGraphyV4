import { existsSync } from 'node:fs';
import { getGraphCachePath } from '@codegraphy-dev/core';

interface ExtensionWorkspaceCacheUpdaterDependencies {
  hasGraphCache?: (workspaceRoot: string) => boolean;
  updateWorkspaceCache(workspaceRoot: string, filePaths: readonly string[]): Promise<void>;
}

export interface ExtensionWorkspaceCacheUpdater {
  dispose(): Promise<void>;
  release(): Promise<void>;
  update(workspaceRoot: string, filePaths: readonly string[]): Promise<void>;
}

function hasWorkspaceGraphCache(workspaceRoot: string): boolean {
  return existsSync(getGraphCachePath(workspaceRoot));
}

export function createExtensionWorkspaceCacheUpdater(
  dependencies: ExtensionWorkspaceCacheUpdaterDependencies,
): ExtensionWorkspaceCacheUpdater {
  let acceptingUpdates = true;
  let tail = Promise.resolve();

  const update = (
    workspaceRoot: string,
    filePaths: readonly string[],
  ): Promise<void> => {
    if (!acceptingUpdates) return Promise.resolve();
    const hasGraphCache = dependencies.hasGraphCache ?? hasWorkspaceGraphCache;
    if (!hasGraphCache(workspaceRoot)) return Promise.resolve();
    const run = tail.then(() => dependencies.updateWorkspaceCache(workspaceRoot, filePaths));
    tail = run.catch(() => undefined);
    return run;
  };
  const release = (): Promise<void> => tail;
  const dispose = (): Promise<void> => {
    acceptingUpdates = false;
    return release();
  };

  return { dispose, release, update };
}
