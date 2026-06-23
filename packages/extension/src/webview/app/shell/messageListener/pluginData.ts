import type { UpdatePluginData } from '../messageListener';

export function handlePluginDataUpdatedMessage(
  raw: { type?: unknown; payload?: unknown },
  updatePluginData: UpdatePluginData,
): boolean {
  if (raw.type !== 'PLUGIN_DATA_UPDATED' || !raw.payload || typeof raw.payload !== 'object') {
    return false;
  }

  const payload = raw.payload as { pluginId?: unknown; data?: unknown };
  if (typeof payload.pluginId !== 'string' || payload.pluginId.length === 0) {
    return false;
  }

  updatePluginData(payload.pluginId, payload.data);
  return true;
}
