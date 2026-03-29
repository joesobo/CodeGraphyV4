import type { PluginRegistry } from '../../../core/plugins/registry/manager';
import { createTypeScriptPlugin } from '../../../../../plugin-typescript/src';
import { createGDScriptPlugin } from '../../../../../plugin-godot/src';
import { createPythonPlugin } from '../../../../../plugin-python/src';
import { createCSharpPlugin } from '../../../../../plugin-csharp/src';
import { createMarkdownPlugin } from '../../../../../plugin-markdown/src';

export interface WorkspaceAnalyzerPluginFilterSource {
  list(): Array<{ plugin: { defaultFilters?: string[] } }>;
}

export interface WorkspaceAnalyzerInitializationDependencies {
  getWorkspaceRoot(): string | undefined;
}

export function getWorkspaceAnalyzerPluginFilterPatterns(
  source: WorkspaceAnalyzerPluginFilterSource,
): string[] {
  const patterns: string[] = [];

  for (const pluginInfo of source.list()) {
    if (pluginInfo.plugin.defaultFilters) {
      patterns.push(...pluginInfo.plugin.defaultFilters);
    }
  }

  return [...new Set(patterns)];
}

export async function initializeWorkspaceAnalyzer(
  registry: PluginRegistry,
  dependencies: WorkspaceAnalyzerInitializationDependencies,
): Promise<void> {
  registry.register(createTypeScriptPlugin(), { builtIn: true });
  registry.register(createGDScriptPlugin(), { builtIn: true });
  registry.register(createPythonPlugin(), { builtIn: true });
  registry.register(createCSharpPlugin(), { builtIn: true });
  registry.register(createMarkdownPlugin(), { builtIn: true });

  const workspaceRoot = dependencies.getWorkspaceRoot();
  if (workspaceRoot) {
    await registry.initializeAll(workspaceRoot);
  }
}
