export function getPluginStatusEntries(raw: { type?: unknown; payload?: unknown }): unknown[] | null {
  if (raw.type !== 'PLUGINS_UPDATED') {
    return null;
  }

  if (!raw.payload || typeof raw.payload !== 'object') {
    return null;
  }

  const plugins = (raw.payload as { plugins?: unknown }).plugins;
  return Array.isArray(plugins) ? plugins : null;
}
