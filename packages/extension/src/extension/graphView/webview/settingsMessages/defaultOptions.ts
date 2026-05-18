import {
  readCodeGraphyInstalledPluginCache,
  type CodeGraphyUserStateOptions,
} from '@codegraphy/core';

export function readInstalledPluginDefaultOptions(
  packageName: string,
  options: CodeGraphyUserStateOptions = {},
): Record<string, unknown> | undefined {
  const defaultOptions = readCodeGraphyInstalledPluginCache(options)
    .plugins
    .find(plugin => plugin.package === packageName)
    ?.defaultOptions;

  return defaultOptions ? { ...defaultOptions } : undefined;
}
