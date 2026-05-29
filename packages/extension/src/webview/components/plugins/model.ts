export function getPluginsPanelWrapperClassName(enabled: boolean): string {
  return enabled ? '' : 'opacity-50';
}

export function getPluginsPanelItemClassName(
  enabled: boolean,
): string {
  return getPluginsPanelWrapperClassName(enabled);
}
