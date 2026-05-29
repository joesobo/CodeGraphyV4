export function isPathWithinDeletedPath(path: string, deletedPath: string): boolean {
  return path === deletedPath || path.startsWith(`${deletedPath}/`);
}

export function filterFavoritesForDeletedPaths(
  favorites: string[],
  deletedPaths: string[],
): string[] {
  return favorites.filter(favorite =>
    !deletedPaths.some(deletedPath => isPathWithinDeletedPath(favorite, deletedPath))
  );
}

export function comparePathDepth(left: string, right: string): number {
  return left.split('/').length - right.split('/').length;
}

export function sortDirectoryPathsByDepth(paths: string[]): string[] {
  return [...paths].sort(comparePathDepth);
}
