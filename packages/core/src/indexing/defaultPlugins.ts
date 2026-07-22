import type { CorePluginRegistry } from '../plugins/registry';
import { loadBundledMarkdownPlugin } from '../plugins/markdown/runtime';
import { analyzeFileWithCoreTreeSitter } from '../treeSitter/core';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  type CodeGraphyWorkspaceSettings,
} from '../workspace/settings';
import type {
  IndexCodeGraphyWorkspaceOptions,
  IndexCodeGraphyWorkspacePlugin,
  IndexCodeGraphyWorkspacePluginEntry,
} from './contracts';

function shouldRegisterDefaultMarkdownPlugin(
  options: IndexCodeGraphyWorkspaceOptions,
  settings: CodeGraphyWorkspaceSettings,
): boolean {
  if (options.includeCorePlugins === false) {
    return false;
  }

  const disabledPlugins = new Set(options.disabledPlugins ?? []);
  if (disabledPlugins.has(CODEGRAPHY_MARKDOWN_PLUGIN_ID)) {
    return false;
  }

  const providedPluginIds = new Set((options.plugins ?? []).map(plugin => readPluginEntry(plugin).plugin.id));
  return settings.plugins.find(plugin => plugin.id === CODEGRAPHY_MARKDOWN_PLUGIN_ID)?.activation !== 'disabled'
    && !providedPluginIds.has(CODEGRAPHY_MARKDOWN_PLUGIN_ID);
}

function getDefaultMarkdownPluginOptions(
  settings: CodeGraphyWorkspaceSettings,
): Record<string, unknown> | undefined {
  return settings.plugins.find(plugin => plugin.id === CODEGRAPHY_MARKDOWN_PLUGIN_ID)?.options;
}

export async function registerDefaultIndexPlugins(
  registry: CorePluginRegistry,
  options: IndexCodeGraphyWorkspaceOptions,
  settings: CodeGraphyWorkspaceSettings,
): Promise<void> {
  if (options.includeCorePlugins !== false) {
    registry.setCoreAnalyzeFileResult(analyzeFileWithCoreTreeSitter);
  }

  if (shouldRegisterDefaultMarkdownPlugin(options, settings)) {
    const markdownOptions = getDefaultMarkdownPluginOptions(settings);
    registry.register(await loadBundledMarkdownPlugin(), {
      builtIn: true,
      sourcePackage: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      ...(markdownOptions ? { options: markdownOptions } : {}),
    });
  }
}

function isPluginEntry(plugin: IndexCodeGraphyWorkspacePlugin): plugin is IndexCodeGraphyWorkspacePluginEntry {
  return 'plugin' in plugin;
}

function readPluginEntry(plugin: IndexCodeGraphyWorkspacePlugin): IndexCodeGraphyWorkspacePluginEntry {
  return isPluginEntry(plugin) ? plugin : { plugin };
}

export function registerProvidedPlugins(
  registry: CorePluginRegistry,
  plugins: readonly IndexCodeGraphyWorkspacePlugin[] | undefined,
  disabledPluginsInput: Iterable<string> = [],
): void {
  const disabledPlugins = new Set(disabledPluginsInput);
  for (const pluginInput of plugins ?? []) {
    const entry = readPluginEntry(pluginInput);
    if (disabledPlugins.has(entry.plugin.id)) {
      continue;
    }

    registry.register(entry.plugin, {
      ...(entry.builtIn !== undefined ? { builtIn: entry.builtIn } : {}),
      ...(entry.sourcePackage ? { sourcePackage: entry.sourcePackage } : {}),
      ...(entry.options ? { options: entry.options } : {}),
    });
  }
}
