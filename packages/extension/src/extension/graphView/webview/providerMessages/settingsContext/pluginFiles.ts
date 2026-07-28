import type { GraphViewProviderMessageListenerSource } from '../listener';

export async function reprocessPluginFiles(
  source: GraphViewProviderMessageListenerSource,
  _pluginIds: readonly string[],
): Promise<void> {
  await source._loadAndSendData();
}
