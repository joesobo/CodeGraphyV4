export function getPluginsPanelChevronClassName(open: boolean): string {
  return open ? 'text-muted-foreground transition-transform rotate-90' : 'text-muted-foreground transition-transform';
}

export function toggleExpandedPluginIds(
  expandedPluginIds: Set<string>,
  pluginId: string
): Set<string> {
  const next = new Set(expandedPluginIds);
  if (next.has(pluginId)) {
    next.delete(pluginId);
  } else {
    next.add(pluginId);
  }
  return next;
}

export function getPluginsPanelWrapperClassName(enabled: boolean): string {
  return enabled ? '' : 'opacity-50';
}

export function getPluginsPanelRuleLabelClassName(enabled: boolean): string {
  return enabled ? 'text-foreground' : 'text-muted-foreground/50';
}

export function shouldRenderPluginsPanelRuleDescription(description: string): boolean {
  return description.length > 0;
}

export function getPluginsPanelRuleCountClassName(enabled: boolean): string {
  return enabled ? 'text-muted-foreground' : 'text-muted-foreground/50';
}

export function shouldRenderPluginsPanelSeparator(index: number, pluginCount: number): boolean {
  return index < pluginCount - 1;
}
