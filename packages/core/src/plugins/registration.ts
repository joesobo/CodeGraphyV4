import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { CorePluginInfo } from './registry';

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
