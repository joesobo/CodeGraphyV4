import {
  DEFAULT_NODE_COLOR,
  FILE_TYPE_COLORS,
} from './fileColorConstants';

export {
  DEFAULT_DIRECTION_COLOR,
  DEFAULT_FOLDER_NODE_COLOR,
  DEFAULT_NODE_COLOR,
  FILE_TYPE_COLORS,
} from './fileColorConstants';

/** Validates and normalizes a hex color string, returning the default if invalid. */
export function normalizeHexColor(value: string | undefined, defaultColor: string): string {
  if (!value) return defaultColor;
  const trimmed = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  return defaultColor;
}

/**
 * Get the display color for a file based on its extension.
 *
 * @param extension - File extension including leading dot (e.g., '.ts')
 * @returns Hex color string for the file type
 *
 * @example
 * ```typescript
 * getFileColor('.ts')   // Returns '#93C5FD' (soft blue)
 * getFileColor('.tsx')  // Returns '#67E8F9' (soft cyan)
 * getFileColor('.xyz')  // Returns '#A1A1AA' (default gray)
 * ```
 */
export function getFileColor(extension: string): string {
  return FILE_TYPE_COLORS[extension.toLowerCase()] ?? DEFAULT_NODE_COLOR;
}
