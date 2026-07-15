import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { CorePluginInfo } from './registry';
import { assertPluginApiCompatibility } from './compatibility';
import { addPluginToExtensionMap } from './extensionMap';

export interface RegisterPluginOptions {
  builtIn?: boolean;
  sourcePackage?: string;
  options?: Record<string, unknown>;
}

export function createCorePluginInfo(
  plugin: IPlugin,
  options: RegisterPluginOptions,
): CorePluginInfo {
  return {
    plugin,
    builtIn: options.builtIn ?? false,
    ...(options.sourcePackage ? { sourcePackage: options.sourcePackage } : {}),
    ...(options.options ? { options: { ...options.options } } : {}),
  };
}

export function registerCorePlugin(
  plugin: IPlugin,
  options: RegisterPluginOptions,
  plugins: Map<string, CorePluginInfo>,
  extensionMap: Map<string, string[]>,
): void {
  if (plugins.has(plugin.id)) throw new Error(`Plugin with ID '${plugin.id}' is already registered`);
  assertPluginApiCompatibility(plugin);
  plugins.set(plugin.id, createCorePluginInfo(plugin, options));
  addPluginToExtensionMap(plugin, extensionMap);
}

export function getPluginFilterPatterns(
  plugins: Iterable<CorePluginInfo>,
  disabledPlugins: ReadonlySet<string>,
): string[] {
  const patterns: string[] = [];
  for (const info of plugins) {
    if (disabledPlugins.has(info.plugin.id)) {
      continue;
    }

    patterns.push(...info.plugin.defaultFilters ?? []);
  }

  return [...new Set(patterns)];
}
