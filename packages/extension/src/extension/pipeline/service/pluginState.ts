import type { IPluginFilterPatternGroup } from '../../../shared/protocol/extensionToWebview';
import {
  getWorkspacePipelinePluginFilterGroups,
  getWorkspacePipelinePluginFilterPatterns,
  initializeWorkspacePipeline,
  syncWorkspacePipelinePlugins,
} from '../plugins/bootstrap';
import { readBundledWorkspacePluginPackageRoots } from '../plugins/bootstrap/bundledPackages';
import * as vscode from 'vscode';
import { shouldActivateWorkspacePlugin } from '../plugins/bootstrap/activation';

type WorkspacePipelinePluginRegistry = Parameters<typeof initializeWorkspacePipeline>[0] & {
  disposeAll(): void;
};

interface WorkspacePipelinePluginFilterConfig {
  disabledCustomFilterPatterns: readonly string[];
  disabledPluginFilterPatterns: readonly string[];
}

function createWorkspacePluginActivationPredicate(workspaceRoot: string | undefined) {
  return (record: Parameters<typeof shouldActivateWorkspacePlugin>[0]) =>
    shouldActivateWorkspacePlugin(
      record,
      (glob, maxResults) => vscode.workspace.findFiles(
        workspaceRoot ? new vscode.RelativePattern(workspaceRoot, glob) : glob,
        undefined,
        maxResults,
      ),
    );
}

export async function initializeWorkspacePipelinePlugins(
  registry: WorkspacePipelinePluginRegistry,
  getWorkspaceRoot: () => string | undefined,
  extensionRoot?: string,
): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  await initializeWorkspacePipeline(registry, {
    bundledPluginPackageRoots: await readBundledWorkspacePluginPackageRoots(extensionRoot),
    getWorkspaceRoot,
    shouldActivatePlugin: createWorkspacePluginActivationPredicate(workspaceRoot),
  });
}

export function queueWorkspacePipelinePluginReload(
  queue: Promise<void>,
  registry: WorkspacePipelinePluginRegistry,
  initialize: () => Promise<void>,
): { nextQueue: Promise<void>; reload: Promise<void> } {
  const reload = queue.then(async () => {
    registry.disposeAll();
    await initialize();
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
  extensionRoot?: string,
): { nextQueue: Promise<void>; sync: Promise<void> } {
  const sync = queue.then(async () => {
    const workspaceRoot = getWorkspaceRoot();
    await syncWorkspacePipelinePlugins(registry, {
      bundledPluginPackageRoots: await readBundledWorkspacePluginPackageRoots(extensionRoot),
      getWorkspaceRoot,
      shouldActivatePlugin: createWorkspacePluginActivationPredicate(workspaceRoot),
    });
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
