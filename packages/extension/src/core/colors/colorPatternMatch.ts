/**
 * @fileoverview Pattern matching helpers for color resolution.
 * @module core/colors/colorPatternMatch
 */

import { minimatch } from 'minimatch';
import type { IColorInfo, ColorSource } from './colorPaletteTypes';

/**
 * Match a file path against multiple pattern maps in order.
 * Returns the first matching color, or null.
 */
export function matchPatternMaps(
  normalizedPath: string,
  fileName: string,
  patternMaps: Map<string, string>[],
): string | null {
  for (const patternMap of patternMaps) {
    for (const [pattern, color] of patternMap) {
      if (pattern === fileName || minimatch(normalizedPath, pattern, { dot: true })) {
        return color;
      }
    }
  }
  return null;
}

/**
 * Match against user/plugin pattern maps returning color info with source.
 */
export function matchPatternMapsWithSource(
  normalizedPath: string,
  fileName: string,
  userPatterns: Map<string, string>,
  userSource: ColorSource,
  pluginPatterns: Map<string, string>,
  pluginSource: ColorSource,
): IColorInfo | null {
  for (const [pattern, color] of userPatterns) {
    if (pattern === fileName || minimatch(normalizedPath, pattern, { dot: true })) {
      return { color, source: userSource };
    }
  }
  for (const [pattern, color] of pluginPatterns) {
    if (pattern === fileName || minimatch(normalizedPath, pattern, { dot: true })) {
      return { color, source: pluginSource };
    }
  }
  return null;
}
