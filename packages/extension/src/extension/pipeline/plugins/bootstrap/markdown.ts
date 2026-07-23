import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  isBundledMarkdownPluginEnabled,
  type CodeGraphyUserStateOptions,
  type CodeGraphyWorkspaceSettings,
} from '@codegraphy-dev/core';

export function getDefaultMarkdownPluginOptions(
  settings: CodeGraphyWorkspaceSettings | undefined,
): Record<string, unknown> | undefined {
  if (!settings) {
    return undefined;
  }

  for (const plugin of settings.plugins) {
    if (plugin.id === CODEGRAPHY_MARKDOWN_PLUGIN_ID && plugin.activation !== 'disabled') {
      return plugin.options;
    }
  }

  return undefined;
}

export function shouldRegisterMarkdownPlugin(
  settings: CodeGraphyWorkspaceSettings | undefined,
  options: CodeGraphyUserStateOptions = {},
): boolean {
  if (!settings) {
    return true;
  }

  return isBundledMarkdownPluginEnabled(settings, options);
}
