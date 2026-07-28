import { existsSync } from 'node:fs';
import { getGraphCachePath } from '@codegraphy-dev/core';

interface ExtensionWorkspaceCacheUpdaterDependencies {
  hasGraphCache?: (workspaceRoot: string) => boolean;
  updateWorkspaceCache(workspaceRoot: string, filePaths: readonly string[]): Promise<void>;
}

export interface ExtensionWorkspaceCacheUpdater {
  dispose(): Promise<void>;
  release(): Promise<void>;
  update(workspaceRoot: string, filePaths: readonly string[]): Promise<boolean>;
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
  ): Promise<boolean> => {
    if (!acceptingUpdates) return Promise.resolve(false);
    const hasGraphCache = dependencies.hasGraphCache ?? hasWorkspaceGraphCache;
    if (!hasGraphCache(workspaceRoot)) return Promise.resolve(false);
    const run = tail.then(async () => {
      await dependencies.updateWorkspaceCache(workspaceRoot, filePaths);
      return true;
    });
    tail = run.then(() => undefined, () => undefined);
    return run;
  };
  const release = (): Promise<void> => tail;
  const dispose = (): Promise<void> => {
    acceptingUpdates = false;
    return release();
  };

  return { dispose, release, update };
}
