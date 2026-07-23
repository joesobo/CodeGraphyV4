import {
  analyzeFileWithCoreTreeSitter,
  listCoreTreeSitterGraphScopeCapabilities,
} from '@codegraphy-dev/core';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import { registerBuiltInWorkspacePipelinePlugins } from './builtIns';
import {
  registerWorkspacePackagePlugins,
  type WorkspacePackagePluginRegistrationDependencies,
} from './packages';
import { readWorkspacePipelineSettings } from './settings';
import { registerWorkspaceExtensionPlugins } from './extensionPackages';

export interface WorkspacePipelineInitializationDependencies
  extends WorkspacePackagePluginRegistrationDependencies {
  getWorkspaceRoot(): string | undefined;
}

export async function initializeWorkspacePipeline(
  registry: PluginRegistry,
  dependencies: WorkspacePipelineInitializationDependencies,
): Promise<void> {
  const { settings, workspaceRoot } = readWorkspacePipelineSettings(() => dependencies.getWorkspaceRoot());

  registry.setCoreAnalyzeFileResult(analyzeFileWithCoreTreeSitter);
  registry.setCoreGraphScopeCapabilitiesProvider(listCoreTreeSitterGraphScopeCapabilities);
  await registerBuiltInWorkspacePipelinePlugins(
    registry,
    settings,
    dependencies.disabledPlugins,
    { ...(dependencies.userHomeDir ? { homeDir: dependencies.userHomeDir } : {}) },
  );

  if (workspaceRoot && settings) {
    await registerWorkspacePackagePlugins(registry, settings, workspaceRoot, dependencies);
    await registerWorkspaceExtensionPlugins(
      registry.extensionPlugins,
      settings,
      workspaceRoot,
      dependencies,
    );
  }

  if (workspaceRoot) {
    await registry.initializeAll(workspaceRoot);
    await registry.extensionPlugins.initializeAll(workspaceRoot);
  }
}
