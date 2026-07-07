import type { IPlugin, IPluginFactoryOptions } from '@codegraphy-dev/plugin-api';

export interface PackagePluginFactoryInvocation {
  options?: IPluginFactoryOptions;
  bindPluginId?(pluginId: string): void;
}

type UnknownPluginFactory = (options?: IPluginFactoryOptions) => unknown;

interface PluginModuleExports {
  default?: unknown;
  createPlugin?: unknown;
  plugin?: unknown;
}

function isPluginFactory(value: unknown): value is UnknownPluginFactory {
  return typeof value === 'function';
}

function isPlugin(value: unknown): value is IPlugin {
  return typeof value === 'object'
    && value !== null
    && typeof (value as { id?: unknown }).id === 'string';
}

export async function createPluginFromModule(
  moduleNamespace: unknown,
  packageName: string,
  invocation: PackagePluginFactoryInvocation = {},
): Promise<IPlugin> {
  if (typeof moduleNamespace !== 'object' || moduleNamespace === null) {
    throw new Error(`CodeGraphy plugin package '${packageName}' did not export a module object.`);
  }

  const moduleExports = moduleNamespace as PluginModuleExports;
  const exportedPlugin: unknown = moduleExports.default ?? moduleExports.createPlugin ?? moduleExports.plugin;
  const plugin: unknown = isPluginFactory(exportedPlugin)
    ? await exportedPlugin(invocation.options)
    : exportedPlugin;

  if (!isPlugin(plugin)) {
    throw new Error(`CodeGraphy plugin package '${packageName}' did not export a plugin factory or plugin object.`);
  }

  invocation.bindPluginId?.(plugin.id);

  return plugin;
}
