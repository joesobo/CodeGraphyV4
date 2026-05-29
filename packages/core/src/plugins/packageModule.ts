import type { IPlugin, IPluginFactoryOptions } from '@codegraphy-dev/plugin-api';

export interface PackagePluginFactoryInvocation {
  options?: IPluginFactoryOptions;
  bindPluginId?(pluginId: string): void;
}

type UnknownPluginFactory = (options?: IPluginFactoryOptions) => unknown;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPluginFactory(value: unknown): value is UnknownPluginFactory {
  return typeof value === 'function';
}

export async function createPluginFromModule(
  moduleNamespace: unknown,
  packageName: string,
  invocation: PackagePluginFactoryInvocation = {},
): Promise<IPlugin> {
  if (!isRecord(moduleNamespace)) {
    throw new Error(`CodeGraphy plugin package '${packageName}' did not export a module object.`);
  }

  const exportedPlugin: unknown = moduleNamespace.default ?? moduleNamespace.createPlugin ?? moduleNamespace.plugin;
  const plugin: unknown = isPluginFactory(exportedPlugin)
    ? await exportedPlugin(invocation.options)
    : exportedPlugin;

  if (!isRecord(plugin) || typeof plugin.id !== 'string') {
    throw new Error(`CodeGraphy plugin package '${packageName}' did not export a plugin factory or plugin object.`);
  }

  invocation.bindPluginId?.(plugin.id);

  return plugin as unknown as IPlugin;
}
