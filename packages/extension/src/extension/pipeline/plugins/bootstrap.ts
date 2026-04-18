import type { PluginRegistry } from '../../../core/plugins/registry/manager';
import { createMarkdownPlugin } from '../../../../../plugin-markdown/src/plugin';
import { createTreeSitterPlugin } from './treesitter/plugin';

export interface WorkspacePipelinePluginFilterSource {
  list(): Array<{ plugin: { id?: string; defaultFilters?: string[] } }>;
}

export interface WorkspacePipelineInitializationDependencies {
  getWorkspaceRoot(): string | undefined;
}

export function getWorkspacePipelinePluginFilterPatterns(
  source: WorkspacePipelinePluginFilterSource,
  disabledPlugins: ReadonlySet<string> = new Set(),
): string[] {
  const patterns: string[] = [];

  for (const pluginInfo of source.list()) {
    if (pluginInfo.plugin.id && disabledPlugins.has(pluginInfo.plugin.id)) {
      continue;
    }

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
  registry.register(createTreeSitterPlugin(), { builtIn: true });

  const workspaceRoot = dependencies.getWorkspaceRoot();
  if (workspaceRoot) {
    await registry.initializeAll(workspaceRoot);
  }
}
