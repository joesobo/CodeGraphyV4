import type { IDiscoveredFile } from '@codegraphy-dev/core';

export function selectMostRepresentedCachedGraphWarmupFile(
  files: readonly IDiscoveredFile[],
): IDiscoveredFile | undefined {
  const extensionStats = new Map<string, {
    count: number;
    file: IDiscoveredFile;
  }>();

  for (const file of files) {
    const extension = file.extension;
    const stats = extensionStats.get(extension);
    if (stats) {
      stats.count += 1;
      continue;
    }

    extensionStats.set(extension, {
      count: 1,
      file,
    });
  }

  let selected: { count: number; file: IDiscoveredFile } | undefined;
  for (const stats of extensionStats.values()) {
    if (!selected || stats.count > selected.count) {
      selected = stats;
    }
  }

  return selected?.file;
}
