/**
 * @fileoverview Color lookup / resolution logic.
 * @module core/colors/colorResolverLookup
 */

import { minimatch } from 'minimatch';
import { DEFAULT_FALLBACK_COLOR } from './colorPaletteTypes';
import type { IColorInfo } from './colorPaletteTypes';
import { getExtension, normalizeExtension } from './colorExtensionUtils';

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
