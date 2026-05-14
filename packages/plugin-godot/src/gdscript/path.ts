/**
 * Normalize path separators to forward slashes.
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/**
 * Check if a path is a Godot resource path (res:// or user://).
 */
export function isResPath(resourcePath: string): boolean {
  return resourcePath.startsWith('res://') || resourcePath.startsWith('user://');
}
