const RECENT_SAVE_WATCHER_SUPPRESSION_MS = 1000;
const recentSavedDocumentPaths = new Map<string, number>();

export function rememberRecentSavedDocumentPath(filePath: string): void {
  const now = Date.now();
  pruneRecentSavedDocumentPaths(now);
  recentSavedDocumentPaths.set(
    normalizeFileWatcherPath(filePath),
    now + RECENT_SAVE_WATCHER_SUPPRESSION_MS,
  );
}

export function consumeRecentSavedDocumentPath(filePath: string): boolean {
  const now = Date.now();
  pruneRecentSavedDocumentPaths(now);
  const normalizedPath = normalizeFileWatcherPath(filePath);
  const expiresAt = recentSavedDocumentPaths.get(normalizedPath);
  if (expiresAt === undefined) {
    return false;
  }

  recentSavedDocumentPaths.delete(normalizedPath);
  return now <= expiresAt;
}

export function normalizeFileWatcherPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function pruneRecentSavedDocumentPaths(now: number): void {
  for (const [filePath, expiresAt] of recentSavedDocumentPaths) {
    if (expiresAt < now) {
      recentSavedDocumentPaths.delete(filePath);
    }
  }
}
