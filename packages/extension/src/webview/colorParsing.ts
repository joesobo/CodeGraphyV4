/**
 * @fileoverview CSS color parsing utilities.
 * @module webview/colorParsing
 */

/**
 * Parses a CSS color string to RGB values.
 * Supports hex colors (#rrggbb) and rgb/rgba(...) notation.
 */
export function parseColor(color: string): { r: number; g: number; b: number } | null {
  // Handle hex colors
  const hexMatch = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (hexMatch) {
    return {
      r: parseInt(hexMatch[1], 16),
      g: parseInt(hexMatch[2], 16),
      b: parseInt(hexMatch[3], 16),
    };
  }

  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
    };
  }

  return null;
}

/**
 * Adjusts a hex color for light theme (darker, more saturated).
 */
export function adjustColorForLightTheme(hexColor: string): string {
  const rgb = parseColor(hexColor);
  if (!rgb) return hexColor;

  // Darken and increase saturation for light theme
  const darkenFactor = 0.7;

  return `#${Math.round(rgb.r * darkenFactor).toString(16).padStart(2, '0')}${Math.round(rgb.g * darkenFactor).toString(16).padStart(2, '0')}${Math.round(rgb.b * darkenFactor).toString(16).padStart(2, '0')}`;
}
