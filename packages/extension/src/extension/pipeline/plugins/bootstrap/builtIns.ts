import { CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME, type CodeGraphyWorkspaceSettings } from '@codegraphy-dev/core';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import type { IPlugin } from '../../../../core/plugins/types/contracts';
import { createMarkdownPlugin } from '../../../../../../plugin-markdown/src/plugin';
import { createTreeSitterPlugin } from '../treesitter/plugin';
import { getDefaultMarkdownPluginOptions, shouldRegisterMarkdownPlugin } from './markdown';

export interface WorkspacePipelinePluginRegistration {
  plugin: IPlugin;
  options: {
    builtIn?: boolean;
    sourcePackage?: string;
    sourcePackageRoot?: string;
    options?: Record<string, unknown>;
  };
}

export function getBuiltInWorkspacePipelinePluginRegistrations(
  settings: CodeGraphyWorkspaceSettings | undefined,
  disabledPluginsInput: Iterable<string> = [],
): WorkspacePipelinePluginRegistration[] {
  const disabledPlugins = new Set(disabledPluginsInput);
  const registrations: WorkspacePipelinePluginRegistration[] = [
    {
      plugin: createTreeSitterPlugin(),
      options: { builtIn: true },
    },
  ];

  if (!shouldRegisterMarkdownPlugin(settings)) {
    return registrations;
  }

  if (disabledPlugins.has('codegraphy.markdown')) {
    return registrations;
  }

  const markdownOptions = getDefaultMarkdownPluginOptions(settings);
  registrations.push({
    plugin: createMarkdownPlugin(),
    options: {
      builtIn: true,
      sourcePackage: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      ...(markdownOptions ? { options: markdownOptions } : {}),
    },
  });

  return registrations;
}

export function registerBuiltInWorkspacePipelinePlugins(
  registry: PluginRegistry,
  settings: CodeGraphyWorkspaceSettings | undefined,
  disabledPlugins?: Iterable<string>,
): void {
  for (const registration of getBuiltInWorkspacePipelinePluginRegistrations(settings, disabledPlugins)) {
    registry.register(registration.plugin, registration.options);
  }
}
