import type { CodeGraphyUserStateOptions } from '@codegraphy-dev/core';
import type { IPluginUpdateImpactPolicy } from '@codegraphy-dev/plugin-api';

export function readInstalledPluginDefaultOptions(
  _pluginId: string,
  _options: CodeGraphyUserStateOptions = {},
): Record<string, unknown> | undefined {
  return undefined;
}

export function readInstalledPluginUpdateImpact(
  _pluginId: string,
  _options: CodeGraphyUserStateOptions = {},
): IPluginUpdateImpactPolicy | undefined {
  return undefined;
}
