import { unwatchFile, watchFile, type Stats } from 'node:fs';

const SENTINEL_INTERVAL_MS = 250;

export interface ExactPathSentinel {
  dispose(): void;
}

export function watchExactPaths(
  filePaths: readonly string[],
  onChange: (filePath: string) => void,
): ExactPathSentinel {
  const listeners = filePaths.map(filePath => {
    const listener = (current: Stats, previous: Stats): void => {
      if (
        current.mtimeMs !== previous.mtimeMs
        || current.size !== previous.size
        || current.ino !== previous.ino
      ) onChange(filePath);
    };
    watchFile(filePath, { interval: SENTINEL_INTERVAL_MS }, listener);
    return { filePath, listener };
  });
  let disposed = false;
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const { filePath, listener } of listeners) unwatchFile(filePath, listener);
    },
  };
}
