import type { IDiscoveredFile } from '@codegraphy-dev/core';

export function selectMostRepresentedCachedGraphWarmupFile(
  files: readonly IDiscoveredFile[],
): IDiscoveredFile | undefined {
  const extensionStats = new Map<string, {
    count: number;
    file: IDiscoveredFile;
    firstIndex: number;
  }>();

  for (const [index, file] of files.entries()) {
    const extension = file.extension;
    const stats = extensionStats.get(extension);
    if (stats) {
      stats.count += 1;
      continue;
    }

    extensionStats.set(extension, {
      count: 1,
      file,
      firstIndex: index,
    });
  }

  return [...extensionStats.values()]
    .sort((left, right) => right.count - left.count || left.firstIndex - right.firstIndex)[0]
    ?.file;
}
