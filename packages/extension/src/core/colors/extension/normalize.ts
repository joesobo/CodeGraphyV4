/**
 * @fileoverview File extension normalization helpers.
 * @module core/colors/extension/normalize
 */

/**
 * Normalizes an extension to lowercase with a leading dot.
 */
export function normalizeExtension(extension: string): string {
  const trimmed = extension.trim().toLowerCase();
  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
}
