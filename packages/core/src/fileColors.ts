import {
  DEFAULT_NODE_COLOR,
  FILE_TYPE_COLORS,
} from './fileColorConstants';

const FILE_TYPE_COLOR_PALETTE: readonly string[] = Object.values(FILE_TYPE_COLORS);

export {
  DEFAULT_DIRECTION_COLOR,
  DEFAULT_FOLDER_NODE_COLOR,
  DEFAULT_NODE_COLOR,
  DEFAULT_PACKAGE_NODE_COLOR,
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
 * @returns The configured color, a deterministic palette color for an unknown
 * extension, or the default color when the extension is empty
 */
export function getFileColor(extension: string): string {
  const normalizedExtension = extension.toLowerCase();
  const configuredColor = FILE_TYPE_COLORS[normalizedExtension];
  if (configuredColor) return configuredColor;
  if (!normalizedExtension) return DEFAULT_NODE_COLOR;
  let hash = 0;
  for (const character of normalizedExtension) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return FILE_TYPE_COLOR_PALETTE[hash % FILE_TYPE_COLOR_PALETTE.length] ?? DEFAULT_NODE_COLOR;
}
