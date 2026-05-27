import type { IPluginStatus } from '../../../shared/plugins/status';

export function getPluginsPanelWrapperClassName(enabled: boolean): string {
  return enabled ? '' : 'opacity-50';
}

export function getPluginsPanelItemClassName(
  enabled: boolean,
): string {
  return getPluginsPanelWrapperClassName(enabled);
}

export function getPluginStatusLabel(plugin: IPluginStatus): string | undefined {
  if (plugin.status === 'unavailable') {
    return 'Runtime unavailable';
  }

  return undefined;
}
