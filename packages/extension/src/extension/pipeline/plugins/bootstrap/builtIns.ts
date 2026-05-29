import { CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME, type CodeGraphyWorkspaceSettings } from '@codegraphy-dev/core';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import { createMarkdownPlugin } from '../../../../../../plugin-markdown/src/plugin';
import { createTreeSitterPlugin } from '../treesitter/plugin';
import { getDefaultMarkdownPluginOptions, shouldRegisterMarkdownPlugin } from './markdown';

export function registerBuiltInWorkspacePipelinePlugins(
  registry: PluginRegistry,
  settings: CodeGraphyWorkspaceSettings | undefined,
): void {
  registry.register(createTreeSitterPlugin(), { builtIn: true });

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
