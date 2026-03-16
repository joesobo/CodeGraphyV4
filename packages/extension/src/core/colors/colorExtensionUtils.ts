/**
 * @fileoverview Extension parsing and normalization utilities for colors.
 * @module core/colors/colorExtensionUtils
 */

/**
 * Checks if a pattern is a simple extension (e.g. '.ts') versus a filename or glob.
 */
export function isExtension(pattern: string): boolean {
  if (pattern.includes('*') || pattern.includes('/') || pattern.includes('\\')) {
    return false;
  }
  if (pattern.startsWith('.') && pattern.length > 1) {
    const afterDot = pattern.slice(1);
    if (!afterDot.includes('.') && afterDot.length <= 4) {
      return true;
    }
    return false;
  }
  return false;
}

/**
 * Normalizes an extension to lowercase with a leading dot.
 */
export function normalizeExtension(extension: string): string {
  const trimmed = extension.trim().toLowerCase();
  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
}

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
