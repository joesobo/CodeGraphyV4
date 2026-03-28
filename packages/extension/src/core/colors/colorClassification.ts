/**
 * @fileoverview Classify color entries as extensions vs patterns.
 * @module core/colors/colorClassification
 */

import { isExtension, normalizeExtension } from './colorExtensionUtils';

/**
 * Classify and set colors into extension and pattern maps.
 * Clears the maps first.
 */
export function classifyAndSetColors(
  colors: Record<string, string>,
  extensionMap: Map<string, string>,
  patternMap: Map<string, string>,
): void {
  extensionMap.clear();
  patternMap.clear();
  mergeColors(colors, extensionMap, patternMap);
}

/**
 * Classify and merge colors into extension and pattern maps (without clearing).
 */
export function mergeColors(
  colors: Record<string, string>,
  extensionMap: Map<string, string>,
  patternMap: Map<string, string>,
): void {
  for (const [pattern, color] of Object.entries(colors)) {
    if (isExtension(pattern)) {
      const normalizedExt = normalizeExtension(pattern);
      extensionMap.set(normalizedExt, color);
    } else {
      patternMap.set(pattern, color);
    }
  }
}
