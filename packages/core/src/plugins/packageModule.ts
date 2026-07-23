import type { IPlugin, IPluginFactory, IPluginFactoryOptions } from '@codegraphy-dev/plugin-api';

export interface PackagePluginFactoryInvocation {
  options?: IPluginFactoryOptions;
}

interface PluginModuleExports {
  default?: unknown;
}

function isPluginFactory(value: unknown): value is IPluginFactory {
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
  if (!isPluginFactory(moduleExports.default)) {
    throw new Error(`CodeGraphy plugin package '${packageName}' must export a default Core plugin factory.`);
  }

  const plugin: unknown = await moduleExports.default(invocation.options);

  if (!isPlugin(plugin)) {
    throw new Error(`CodeGraphy plugin package '${packageName}' default factory returned an invalid Core plugin runtime.`);
  }

  return plugin;
}
