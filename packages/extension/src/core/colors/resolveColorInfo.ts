/**
 * @fileoverview Resolve color info (color + source) for a file path.
 * @module core/colors/resolveColorInfo
 */

import { DEFAULT_FALLBACK_COLOR } from './colorPaletteTypes';
import type { IColorInfo } from './colorPaletteTypes';
import { getExtension, normalizeExtension } from './colorExtensionUtils';
import { matchPatternMapsWithSource } from './colorPatternMatch';

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

  const patternMatch = matchPatternMapsWithSource(
    normalizedPath, fileName,
    userPatternColors, 'user',
    pluginPatternColors, 'plugin',
  );
  if (patternMatch) return patternMatch;

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
