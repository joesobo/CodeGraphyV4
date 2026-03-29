/**
 * @fileoverview File extension extraction helpers.
 * @module core/colors/extension/extract
 */

/**
 * Extracts the extension from a file path.
 * Excludes dotfiles like '.gitignore' (returns '' for them).
 */
export function getExtension(filePath: string): string {
  const fileName = filePath.split('/').pop() || filePath;
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot > 0) {
    return fileName.slice(lastDot);
  }
  return '';
}
