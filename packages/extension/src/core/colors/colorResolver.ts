/**
 * @fileoverview Pure color resolution functions extracted from ColorPaletteManager.
 * Operates on plain data structures (Maps) with no class state.
 * @module core/colors/colorResolver
 */

import { minimatch } from 'minimatch';
import { DEFAULT_FALLBACK_COLOR, IColorInfo } from './colorPaletteManager';

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

/**
 * Resolves the color for a file path given all color maps.
 * Priority: user patterns > plugin patterns > user extensions > plugin extensions > generated > fallback.
 */
export function resolveColor(
  filePath: string,
  userPatternColors: Map<string, string>,
  pluginPatternColors: Map<string, string>,
  userExtensionColors: Map<string, string>,
  pluginExtensionColors: Map<string, string>,
  generatedColors: Map<string, string>,
): string {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const fileName = normalizedPath.split('/').pop() || normalizedPath;

  for (const [pattern, color] of userPatternColors) {
    if (pattern === fileName || minimatch(normalizedPath, pattern, { dot: true })) {
      return color;
    }
  }

  for (const [pattern, color] of pluginPatternColors) {
    if (pattern === fileName || minimatch(normalizedPath, pattern, { dot: true })) {
      return color;
    }
  }

  const ext = getExtension(normalizedPath);
  const normalizedExt = normalizeExtension(ext);

  const userColor = userExtensionColors.get(normalizedExt);
  if (userColor) return userColor;

  const pluginColor = pluginExtensionColors.get(normalizedExt);
  if (pluginColor) return pluginColor;

  const generatedColor = generatedColors.get(normalizedExt);
  if (generatedColor) return generatedColor;

  return DEFAULT_FALLBACK_COLOR;
}

/**
 * Resolves color info (color + source) for a file path given all color maps.
 */
export function resolveColorInfo(
  filePath: string,
  userPatternColors: Map<string, string>,
  pluginPatternColors: Map<string, string>,
  userExtensionColors: Map<string, string>,
  pluginExtensionColors: Map<string, string>,
  generatedColors: Map<string, string>,
): IColorInfo {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const fileName = normalizedPath.split('/').pop() || normalizedPath;

  for (const [pattern, color] of userPatternColors) {
    if (pattern === fileName || minimatch(normalizedPath, pattern, { dot: true })) {
      return { color, source: 'user' };
    }
  }

  for (const [pattern, color] of pluginPatternColors) {
    if (pattern === fileName || minimatch(normalizedPath, pattern, { dot: true })) {
      return { color, source: 'plugin' };
    }
  }

  const ext = getExtension(normalizedPath);
  const normalizedExt = normalizeExtension(ext);

  const userColor = userExtensionColors.get(normalizedExt);
  if (userColor) return { color: userColor, source: 'user' };

  const pluginColor = pluginExtensionColors.get(normalizedExt);
  if (pluginColor) return { color: pluginColor, source: 'plugin' };

  const generatedColor = generatedColors.get(normalizedExt);
  if (generatedColor) return { color: generatedColor, source: 'generated' };

  return { color: DEFAULT_FALLBACK_COLOR, source: 'generated' };
}
