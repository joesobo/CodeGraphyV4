import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  loadBundledMarkdownPlugin,
  type CodeGraphyWorkspaceSettings,
} from '@codegraphy-dev/core';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import type { IPlugin } from '../../../../core/plugins/types/contracts';
import { getDefaultMarkdownPluginOptions, shouldRegisterMarkdownPlugin } from './markdown';

export interface WorkspacePipelinePluginRegistration {
  plugin: IPlugin;
  options: {
    builtIn?: boolean;
    sourcePackage?: string;
    sourcePackageRoot?: string;
    descriptorSignature?: string;
    options?: Record<string, unknown>;
    interfaces?: Array<{ id: string; data: unknown }>;
  };
}

export async function getBuiltInWorkspacePipelinePluginRegistrations(
  settings: CodeGraphyWorkspaceSettings | undefined,
  disabledPluginsInput: Iterable<string> = [],
): Promise<WorkspacePipelinePluginRegistration[]> {
  const disabledPlugins = new Set(disabledPluginsInput);
  const registrations: WorkspacePipelinePluginRegistration[] = [];

  if (
    shouldRegisterMarkdownPlugin(settings)
    && !disabledPlugins.has(CODEGRAPHY_MARKDOWN_PLUGIN_ID)
  ) {
    const markdownOptions = getDefaultMarkdownPluginOptions(settings);
    registrations.push({
      plugin: await loadBundledMarkdownPlugin(),
      options: {
        builtIn: true,
        sourcePackage: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
        ...(markdownOptions ? { options: markdownOptions } : {}),
      },
    });
  }

  return registrations;
}

export async function registerBuiltInWorkspacePipelinePlugins(
  registry: PluginRegistry,
  settings: CodeGraphyWorkspaceSettings | undefined,
  disabledPlugins?: Iterable<string>,
): Promise<void> {
  for (const registration of await getBuiltInWorkspacePipelinePluginRegistrations(settings, disabledPlugins)) {
    registry.register(registration.plugin, registration.options);
  }
}
