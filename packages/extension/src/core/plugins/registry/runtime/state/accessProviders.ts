import type {
  IAccessProvider,
  IPluginInfo,
} from '../../../types/contracts';

export function listPluginAccessProviders(pluginInfos: Iterable<IPluginInfo>): IAccessProvider[] {
  return Array.from(pluginInfos)
    .map(info => info.plugin.accessProvider)
    .filter((provider): provider is IAccessProvider => provider !== undefined);
}
