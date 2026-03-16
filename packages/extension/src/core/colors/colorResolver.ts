/**
 * @fileoverview Pure functions for resolving file colors from layered color maps.
 * These functions are stateless and receive color maps as parameters.
 * @module core/colors/colorResolver
 */

import { minimatch } from 'minimatch';
import { DEFAULT_FALLBACK_COLOR, IColorInfo } from './ColorPaletteManager';

/**
 * Checks if a pattern is a simple extension (e.g., '.ts', 'ts')
 * vs a filename/pattern (e.g., '.gitignore', glob patterns).
 */
export function isExtension(value: string): boolean {
  // Contains glob characters or path separators = pattern
  if (value.includes('*') || value.includes('/') || value.includes('\\')) {
    return false;
  }
  // Starts with dot and has more characters after = could be extension OR dotfile
  if (value.startsWith('.') && value.length > 1) {
    // If it has no other dots, it's likely a dotfile like .gitignore
    // If the part after the first dot is short (1-4 chars), it's likely an extension
    const afterDot = value.slice(1);
    if (!afterDot.includes('.') && afterDot.length <= 4) {
      return true; // .ts, .tsx, .js, .md, etc.
    }
    return false; // .gitignore, .eslintrc, etc.
  }
  // No dot = likely a filename like 'Makefile'
  return false;
}

/**
 * Normalizes an extension to lowercase with a leading dot.
 */
export function normalizeExtension(ext: string): string {
  const trimmed = ext.trim().toLowerCase();
  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
}

/**
 * Extracts the extension from a file path.
 * Returns '' for dotfiles like .gitignore.
 */
export function getExtension(filePath: string): string {
  const fileName = filePath.split('/').pop() || filePath;
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot > 0) { // > 0 to exclude dotfiles like .gitignore
    return fileName.slice(lastDot);
  }
  return '';
}

/**
 * Resolves the color for a file path from layered color maps.
 *
 * Priority order:
 * 1. User pattern colors (highest)
 * 2. Plugin pattern colors
 * 3. User extension colors
 * 4. Plugin extension colors
 * 5. Generated colors
 * 6. Fallback color (lowest)
 *
 * @param path - Workspace-relative file path (normalized to forward slashes)
 * @param extensionColors - Map of normalized extension → color, priority order: [user, plugin, generated]
 * @param folderColors - unused (reserved for future folder-level overrides)
 * @param fileColors - Map of pattern → color, priority order: [user, plugin]
 */
export function resolveColor(
  path: string,
  userExtensionColors: ReadonlyMap<string, string>,
  userPatternColors: ReadonlyMap<string, string>,
  pluginExtensionColors: ReadonlyMap<string, string>,
  pluginPatternColors: ReadonlyMap<string, string>,
  generatedColors: ReadonlyMap<string, string>
): string {
  const normalizedPath = path.replace(/\\/g, '/');
  const fileName = normalizedPath.split('/').pop() || normalizedPath;

  // Priority 1: User patterns (highest)
  for (const [pattern, color] of userPatternColors) {
    if (pattern === fileName || minimatch(normalizedPath, pattern, { dot: true })) {
      return color;
    }
  }

  // Priority 2: Plugin patterns
  for (const [pattern, color] of pluginPatternColors) {
    if (pattern === fileName || minimatch(normalizedPath, pattern, { dot: true })) {
      return color;
    }
  }

  // Fall back to extension-based lookup
  const ext = getExtension(normalizedPath);
  const normalizedExt = normalizeExtension(ext);

  // Priority 3: User extension colors
  const userColor = userExtensionColors.get(normalizedExt);
  if (userColor) return userColor;

  // Priority 4: Plugin extension colors
  const pluginColor = pluginExtensionColors.get(normalizedExt);
  if (pluginColor) return pluginColor;

  // Priority 5: Generated colors
  const generatedColor = generatedColors.get(normalizedExt);
  if (generatedColor) return generatedColor;

  return DEFAULT_FALLBACK_COLOR;
}

/**
 * Resolves the color and its source for a file path from layered color maps.
 */
export function resolveColorInfo(
  path: string,
  userExtensionColors: ReadonlyMap<string, string>,
  userPatternColors: ReadonlyMap<string, string>,
  pluginExtensionColors: ReadonlyMap<string, string>,
  pluginPatternColors: ReadonlyMap<string, string>,
  generatedColors: ReadonlyMap<string, string>
): IColorInfo {
  const normalizedPath = path.replace(/\\/g, '/');
  const fileName = normalizedPath.split('/').pop() || normalizedPath;

  // Priority 1: User patterns (highest)
  for (const [pattern, color] of userPatternColors) {
    if (pattern === fileName || minimatch(normalizedPath, pattern, { dot: true })) {
      return { color, source: 'user' };
    }
  }

  // Priority 2: Plugin patterns
  for (const [pattern, color] of pluginPatternColors) {
    if (pattern === fileName || minimatch(normalizedPath, pattern, { dot: true })) {
      return { color, source: 'plugin' };
    }
  }

  // Fall back to extension-based lookup
  const ext = getExtension(normalizedPath);
  const normalizedExt = normalizeExtension(ext);

  // Priority 3: User extension colors
  const userColor = userExtensionColors.get(normalizedExt);
  if (userColor) return { color: userColor, source: 'user' };

  // Priority 4: Plugin extension colors
  const pluginColor = pluginExtensionColors.get(normalizedExt);
  if (pluginColor) return { color: pluginColor, source: 'plugin' };

  // Priority 5: Generated colors
  const generatedColor = generatedColors.get(normalizedExt);
  if (generatedColor) return { color: generatedColor, source: 'generated' };

  return { color: DEFAULT_FALLBACK_COLOR, source: 'generated' };
}
