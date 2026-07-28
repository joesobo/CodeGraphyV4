import {
  createCodeGraphyWorkspaceCacheUpdater,
  readCodeGraphyWorkspaceStatus,
  type CodeGraphyWorkspaceCacheUpdater,
  type CodeGraphyWorkspaceCacheUpdaterOptions,
} from '@codegraphy-dev/core';

interface ExtensionWorkspaceCacheUpdaterDependencies {
  createUpdater(options: CodeGraphyWorkspaceCacheUpdaterOptions): CodeGraphyWorkspaceCacheUpdater;
  hasGraphCache?: (workspaceRoot: string) => boolean;
}

export interface ExtensionWorkspaceCacheUpdater {
  dispose(): Promise<void>;
  update(workspaceRoot: string, filePaths: readonly string[]): Promise<void>;
}

interface ActiveWorkspaceCacheUpdater {
  start: Promise<unknown>;
  updater: CodeGraphyWorkspaceCacheUpdater;
  workspaceRoot: string;
}

function hasWorkspaceGraphCache(workspaceRoot: string): boolean {
  return readCodeGraphyWorkspaceStatus(workspaceRoot).hasGraphCache;
}

const DEFAULT_DEPENDENCIES: ExtensionWorkspaceCacheUpdaterDependencies = {
  createUpdater: createCodeGraphyWorkspaceCacheUpdater,
  hasGraphCache: hasWorkspaceGraphCache,
};

export function createExtensionWorkspaceCacheUpdater(
  dependencies: ExtensionWorkspaceCacheUpdaterDependencies = DEFAULT_DEPENDENCIES,
): ExtensionWorkspaceCacheUpdater {
  let active: ActiveWorkspaceCacheUpdater | undefined;

  const dispose = async (): Promise<void> => {
    const current = active;
    active = undefined;
    if (current) await current.updater.dispose();
  };
  const update = async (
    workspaceRoot: string,
    filePaths: readonly string[],
  ): Promise<void> => {
    if (active?.workspaceRoot !== workspaceRoot) {
      await dispose();
      const hasGraphCache = dependencies.hasGraphCache ?? hasWorkspaceGraphCache;
      if (!hasGraphCache(workspaceRoot)) return;
      const updater = dependencies.createUpdater({ workspaceRoot });
      active = {
        start: updater.start(),
        updater,
        workspaceRoot,
      };
    }
    const current = active;
    current.updater.notify(filePaths);
    try {
      await current.start;
    } catch (error) {
      if (active === current) active = undefined;
      await current.updater.dispose();
      throw error;
    }
  };

  return { dispose, update };
}
