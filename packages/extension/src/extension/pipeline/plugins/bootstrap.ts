import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  getWorkspaceSettingsPath,
  loadCodeGraphyWorkspacePluginPackages,
  readCodeGraphyWorkspaceSettings,
  type CodeGraphyWorkspaceSettings,
} from '@codegraphy-dev/core';
import * as fs from 'node:fs';
import type { IPluginFilterPatternGroup } from '../../../shared/protocol/extensionToWebview';
import type { PluginRegistry } from '../../../core/plugins/registry/manager';
import { createMarkdownPlugin } from '../../../../../plugin-markdown/src/plugin';
import { createTreeSitterPlugin } from './treesitter/plugin';

export interface WorkspacePipelinePluginFilterSource {
  list(): Array<{ plugin: { id?: string; name?: string; defaultFilters?: string[] } }>;
}

export interface WorkspacePipelineInitializationDependencies {
  getWorkspaceRoot(): string | undefined;
  userHomeDir?: string;
  warn?: (message: string) => void;
}

function getDefaultMarkdownPluginOptions(
  settings: CodeGraphyWorkspaceSettings | undefined,
): Record<string, unknown> | undefined {
  return settings?.plugins.find(plugin => plugin.package === CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME)?.options;
}

function shouldRegisterMarkdownPlugin(settings: CodeGraphyWorkspaceSettings | undefined): boolean {
  if (!settings) {
    return true;
  }

  return settings.plugins.some(plugin => plugin.package === CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME);
}

function readWorkspacePipelineSettings(
  workspaceRoot: string | undefined,
): CodeGraphyWorkspaceSettings | undefined {
  return workspaceRoot && fs.existsSync(getWorkspaceSettingsPath(workspaceRoot))
    ? readCodeGraphyWorkspaceSettings(workspaceRoot)
    : undefined;
}

function registerMarkdownPlugin(
  registry: PluginRegistry,
  settings: CodeGraphyWorkspaceSettings | undefined,
): void {
  if (!shouldRegisterMarkdownPlugin(settings)) {
    return;
  }

  const markdownOptions = getDefaultMarkdownPluginOptions(settings);
  registry.register(createMarkdownPlugin(), {
    builtIn: true,
    sourcePackage: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
    ...(markdownOptions ? { options: markdownOptions } : {}),
  });
}

async function registerWorkspacePackagePlugins(
  registry: PluginRegistry,
  workspaceRoot: string | undefined,
  settings: CodeGraphyWorkspaceSettings | undefined,
  dependencies: WorkspacePipelineInitializationDependencies,
): Promise<void> {
  if (!workspaceRoot || !settings) {
    return;
  }

  const loadedPackagePlugins = await loadCodeGraphyWorkspacePluginPackages({
    settings,
    ...(dependencies.userHomeDir ? { homeDir: dependencies.userHomeDir } : {}),
    ...(dependencies.warn ? { warn: dependencies.warn } : {}),
  });

  for (const loadedPlugin of loadedPackagePlugins) {
    registry.register(loadedPlugin.plugin, {
      sourcePackage: loadedPlugin.packageName,
      ...(loadedPlugin.options ? { options: loadedPlugin.options } : {}),
    });
  }
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

export function getWorkspacePipelinePluginFilterGroups(
  source: WorkspacePipelinePluginFilterSource,
  disabledPlugins: ReadonlySet<string> = new Set(),
): IPluginFilterPatternGroup[] {
  return source.list()
    .filter(pluginInfo => !pluginInfo.plugin.id || !disabledPlugins.has(pluginInfo.plugin.id))
    .map((pluginInfo): IPluginFilterPatternGroup | null => {
      const patterns = pluginInfo.plugin.defaultFilters ?? [];
      if (patterns.length === 0) {
        return null;
      }

      return {
        pluginId: pluginInfo.plugin.id ?? pluginInfo.plugin.name ?? 'plugin',
        pluginName: pluginInfo.plugin.name ?? pluginInfo.plugin.id ?? 'Plugin',
        patterns: [...new Set(patterns)],
      };
    })
    .filter((group): group is IPluginFilterPatternGroup => group !== null);
}

export async function initializeWorkspacePipeline(
  registry: PluginRegistry,
  dependencies: WorkspacePipelineInitializationDependencies,
): Promise<void> {
  const workspaceRoot = dependencies.getWorkspaceRoot();
  const settings = readWorkspacePipelineSettings(workspaceRoot);
  registry.register(createTreeSitterPlugin(), { builtIn: true });
  registerMarkdownPlugin(registry, settings);
  await registerWorkspacePackagePlugins(registry, workspaceRoot, settings, dependencies);

  if (workspaceRoot) {
    await registry.initializeAll(workspaceRoot);
  }
}
