/**
 * @fileoverview Resolve a single color string for a file path.
 * @module core/colors/resolveColor
 */

import { DEFAULT_FALLBACK_COLOR } from './colorPaletteTypes';
import { getExtension, normalizeExtension } from './colorExtensionUtils';
import { matchPatternMaps } from './colorPatternMatch';

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

  const patternMatch = matchPatternMaps(normalizedPath, fileName, [userPatternColors, pluginPatternColors]);
  if (patternMatch) return patternMatch;

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
