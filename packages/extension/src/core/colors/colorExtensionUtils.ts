/**
 * @fileoverview Re-exports for extension parsing and normalization.
 * @module core/colors/colorExtensionUtils
 */

export { isExtension } from './colorIsExtension';

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
