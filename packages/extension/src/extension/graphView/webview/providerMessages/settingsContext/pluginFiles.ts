import type { GraphViewProviderMessageListenerSource } from '../listener';

export async function reprocessPluginFiles(
  source: GraphViewProviderMessageListenerSource,
  pluginIds: readonly string[],
): Promise<void> {
  if (source.refreshPluginFiles) {
    await source.refreshPluginFiles(pluginIds);
    return;
  }

  const invalidatedFilePaths = source.invalidatePluginFiles?.(pluginIds);
  if (invalidatedFilePaths && invalidatedFilePaths.length > 0) {
    await source.refreshChangedFiles(invalidatedFilePaths);
    return;
  }

  if (invalidatedFilePaths) {
    return;
  }

  await source._analyzeAndSendData();
}
