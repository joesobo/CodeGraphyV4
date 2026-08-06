/** Validates and normalizes a hex color string, returning the default if invalid. */
export function normalizeHexColor(value: string | undefined, defaultColor: string): string {
  if (!value) return defaultColor;
  const trimmed = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(trimmed) ? trimmed.toUpperCase() : defaultColor;
}
