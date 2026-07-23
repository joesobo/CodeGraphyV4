import type { IPluginFilterPatternGroup } from '../../../shared/protocol/extensionToWebview';
import {
  getWorkspacePipelinePluginFilterGroups,
  getWorkspacePipelinePluginFilterPatterns,
  initializeWorkspacePipeline,
  syncWorkspacePipelinePlugins,
} from '../plugins/bootstrap';
import { readBundledWorkspacePluginPackageRoots } from '../plugins/bootstrap/bundledPackages';

type WorkspacePipelinePluginRegistry = Parameters<typeof initializeWorkspacePipeline>[0] & {
  disposeAll(): void;
};

interface WorkspacePipelinePluginFilterConfig {
  disabledCustomFilterPatterns: readonly string[];
  disabledPluginFilterPatterns: readonly string[];
}

export async function initializeWorkspacePipelinePlugins(
  registry: WorkspacePipelinePluginRegistry,
  getWorkspaceRoot: () => string | undefined,
  extensionRoot?: string,
): Promise<void> {
  await initializeWorkspacePipeline(registry, {
    bundledPluginPackageRoots: await readBundledWorkspacePluginPackageRoots(extensionRoot),
    getWorkspaceRoot,
  });
}

export function queueWorkspacePipelinePluginReload(
  queue: Promise<void>,
  registry: WorkspacePipelinePluginRegistry,
  initialize: () => Promise<void>,
  isHostActive: () => boolean,
): { nextQueue: Promise<void>; reload: Promise<void> } {
  const reload = queue.then(async () => {
    if (!isHostActive()) return;
    registry.disposeAll();
    if (!isHostActive()) return;
    try {
      await initialize();
    } finally {
      if (!isHostActive()) registry.disposeAll();
    }
  });

  return {
    nextQueue: reload.catch(() => undefined),
    reload,
  };
}

export function queueWorkspacePipelinePluginSync(
  queue: Promise<void>,
  registry: WorkspacePipelinePluginRegistry,
  getWorkspaceRoot: () => string | undefined,
  isHostActive: () => boolean,
  extensionRoot?: string,
): { nextQueue: Promise<void>; sync: Promise<void> } {
  const sync = queue.then(async () => {
    if (!isHostActive()) return;
    try {
      await syncWorkspacePipelinePlugins(registry, {
        bundledPluginPackageRoots: await readBundledWorkspacePluginPackageRoots(extensionRoot),
        getWorkspaceRoot,
      });
    } finally {
      if (!isHostActive()) registry.disposeAll();
    }
  });

  return {
    nextQueue: sync.catch(() => undefined),
    sync,
  };
}

export function getPipelinePluginFilterPatterns(
  registry: WorkspacePipelinePluginRegistry,
  disabledPlugins: ReadonlySet<string> = new Set(),
): string[] {
  return getWorkspacePipelinePluginFilterPatterns(registry, disabledPlugins);
}

export function getPipelinePluginFilterGroups(
  registry: WorkspacePipelinePluginRegistry,
  disabledPlugins: ReadonlySet<string> = new Set(),
): IPluginFilterPatternGroup[] {
  return getWorkspacePipelinePluginFilterGroups(registry, disabledPlugins);
}

export function getEffectiveCustomFilterPatterns(
  config: WorkspacePipelinePluginFilterConfig,
  filterPatterns: string[],
): string[] {
  const disabledPatterns = new Set(config.disabledCustomFilterPatterns);
  return filterPatterns.filter(pattern => !disabledPatterns.has(pattern));
}

export function getEffectivePluginFilterPatterns(
  registry: WorkspacePipelinePluginRegistry,
  config: WorkspacePipelinePluginFilterConfig,
  disabledPlugins: ReadonlySet<string>,
): string[] {
  const disabledPatterns = new Set(config.disabledPluginFilterPatterns);
  return getPipelinePluginFilterPatterns(registry, disabledPlugins)
    .filter(pattern => !disabledPatterns.has(pattern));
}
