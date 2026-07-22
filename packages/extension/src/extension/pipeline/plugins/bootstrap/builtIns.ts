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
    sourceSignature?: string;
    options?: Record<string, unknown>;
    interfaces?: Array<{ id: string; data: unknown }>;
  };
}

export interface WorkspacePipelinePluginCandidate {
  id: string;
  options: WorkspacePipelinePluginRegistration['options'];
  load(): Promise<WorkspacePipelinePluginRegistration>;
}

export async function getBuiltInWorkspacePipelinePluginCandidates(
  settings: CodeGraphyWorkspaceSettings | undefined,
  disabledPluginsInput: Iterable<string> = [],
): Promise<WorkspacePipelinePluginCandidate[]> {
  const disabledPlugins = new Set(disabledPluginsInput);
  if (
    !shouldRegisterMarkdownPlugin(settings)
    || disabledPlugins.has(CODEGRAPHY_MARKDOWN_PLUGIN_ID)
  ) return [];

  const markdownOptions = getDefaultMarkdownPluginOptions(settings);
  const options: WorkspacePipelinePluginRegistration['options'] = {
    builtIn: true,
    sourcePackage: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
    ...(markdownOptions ? { options: markdownOptions } : {}),
  };
  return [{
    id: CODEGRAPHY_MARKDOWN_PLUGIN_ID,
    options,
    async load(): Promise<WorkspacePipelinePluginRegistration> {
      return { plugin: await loadBundledMarkdownPlugin(), options };
    },
  }];
}

export async function getBuiltInWorkspacePipelinePluginRegistrations(
  settings: CodeGraphyWorkspaceSettings | undefined,
  disabledPluginsInput: Iterable<string> = [],
): Promise<WorkspacePipelinePluginRegistration[]> {
  const candidates = await getBuiltInWorkspacePipelinePluginCandidates(settings, disabledPluginsInput);
  return Promise.all(candidates.map(candidate => candidate.load()));
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
