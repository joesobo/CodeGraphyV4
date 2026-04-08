import type { PluginRegistry } from '../../../core/plugins/registry/manager';
import { createMarkdownPlugin } from '../../../../../plugin-markdown/src/plugin';

export interface WorkspacePipelinePluginFilterSource {
  list(): Array<{ plugin: { defaultFilters?: string[] } }>;
}

export interface WorkspacePipelineInitializationDependencies {
  getWorkspaceRoot(): string | undefined;
}

export function getWorkspacePipelinePluginFilterPatterns(
  source: WorkspacePipelinePluginFilterSource,
): string[] {
  const patterns: string[] = [];

  for (const pluginInfo of source.list()) {
    if (pluginInfo.plugin.defaultFilters) {
      patterns.push(...pluginInfo.plugin.defaultFilters);
    }
  }

  return [...new Set(patterns)];
}

export async function initializeWorkspacePipeline(
  registry: PluginRegistry,
  dependencies: WorkspacePipelineInitializationDependencies,
): Promise<void> {
  registry.register(createMarkdownPlugin(), { builtIn: true });

  const workspaceRoot = dependencies.getWorkspaceRoot();
  if (workspaceRoot) {
    await registry.initializeAll(workspaceRoot);
  }
}
