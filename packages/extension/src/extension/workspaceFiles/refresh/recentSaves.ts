const RECENT_SAVE_WATCHER_SUPPRESSION_MS = 1000;
const RECENT_MUTATION_WATCHER_SUPPRESSION_MS = 30_000;
const recentSavedDocumentPaths = new Map<string, number>();
const recentWorkspaceMutationPaths = new Map<string, number>();

export function rememberRecentSavedDocumentPath(filePath: string): void {
  const now = Date.now();
  pruneRecentSavedDocumentPaths(now);
  recentSavedDocumentPaths.set(
    normalizeFileWatcherPath(filePath),
    now + RECENT_SAVE_WATCHER_SUPPRESSION_MS,
  );
}

export function isRecentSavedDocumentPath(filePath: string): boolean {
  const now = Date.now();
  pruneRecentSavedDocumentPaths(now);
  const normalizedPath = normalizeFileWatcherPath(filePath);
  return recentSavedDocumentPaths.has(normalizedPath);
}

export function rememberRecentWorkspaceMutationPaths(filePaths: readonly string[]): void {
  const now = Date.now();
  prunePaths(recentWorkspaceMutationPaths, now);
  for (const filePath of filePaths) {
    recentWorkspaceMutationPaths.set(
      normalizeFileWatcherPath(filePath),
      now + RECENT_MUTATION_WATCHER_SUPPRESSION_MS,
    );
  }
}

export function isRecentWorkspaceMutationPath(filePath: string): boolean {
  const now = Date.now();
  prunePaths(recentWorkspaceMutationPaths, now);
  return recentWorkspaceMutationPaths.has(normalizeFileWatcherPath(filePath));
}

export function normalizeFileWatcherPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function pruneRecentSavedDocumentPaths(now: number): void {
  prunePaths(recentSavedDocumentPaths, now);
}

function prunePaths(paths: Map<string, number>, now: number): void {
  for (const [filePath, expiresAt] of paths) {
    if (expiresAt < now) {
      paths.delete(filePath);
    }
  }
}
