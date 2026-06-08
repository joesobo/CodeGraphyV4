import { analyzeFileWithCoreTreeSitter } from '@codegraphy-dev/core';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import { registerBuiltInWorkspacePipelinePlugins } from './builtIns';
import {
  registerWorkspacePackagePlugins,
  type WorkspacePackagePluginRegistrationDependencies,
} from './packages';
import { readWorkspacePipelineSettings } from './settings';

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
  await registerBuiltInWorkspacePipelinePlugins(registry, settings, dependencies.disabledPlugins);

  if (workspaceRoot && settings) {
    await registerWorkspacePackagePlugins(registry, settings, workspaceRoot, dependencies);
  }

  if (workspaceRoot) {
    await registry.initializeAll(workspaceRoot);
  }
}
