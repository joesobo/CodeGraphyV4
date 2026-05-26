import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { createMarkdownPlugin } from '@codegraphy-dev/plugin-markdown';
import type { CorePluginRegistry } from '../plugins/registry';
import { createTreeSitterPlugin } from '../treeSitter/plugin';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  type CodeGraphyWorkspaceSettings,
} from '../workspace/settings';
import type { IndexCodeGraphyWorkspaceOptions } from './contracts';

function shouldRegisterDefaultMarkdownPlugin(
  options: IndexCodeGraphyWorkspaceOptions,
  settings: CodeGraphyWorkspaceSettings,
): boolean {
  if (options.includeCorePlugins === false) {
    return false;
  }

  const providedPluginIds = new Set((options.plugins ?? []).map(plugin => plugin.id));
  return settings.plugins.some(plugin => plugin.package === CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME)
    && !providedPluginIds.has('codegraphy.markdown');
}

function getDefaultMarkdownPluginOptions(
  settings: CodeGraphyWorkspaceSettings,
): Record<string, unknown> | undefined {
  return settings.plugins.find(plugin => plugin.package === CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME)?.options;
}

export function registerDefaultIndexPlugins(
  registry: CorePluginRegistry,
  options: IndexCodeGraphyWorkspaceOptions,
  settings: CodeGraphyWorkspaceSettings,
): void {
  if (options.includeCorePlugins !== false) {
    registry.register(createTreeSitterPlugin(), { builtIn: true });
  }

  if (shouldRegisterDefaultMarkdownPlugin(options, settings)) {
    const markdownOptions = getDefaultMarkdownPluginOptions(settings);
    registry.register(createMarkdownPlugin(), {
      builtIn: true,
      sourcePackage: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      ...(markdownOptions ? { options: markdownOptions } : {}),
    });
  }
}

export function registerProvidedPlugins(registry: CorePluginRegistry, plugins: readonly IPlugin[] | undefined): void {
  for (const plugin of plugins ?? []) {
    registry.register(plugin);
  }
}
