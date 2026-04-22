export interface LegendColorValue {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function clampAlpha(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function formatHexChannel(value: number): string {
  return clampChannel(value).toString(16).padStart(2, '0').toUpperCase();
}

function parseHexColor(color: string): LegendColorValue | null {
  const hexMatch = color.trim().match(/^#([0-9a-f]{6})$/i);
  if (!hexMatch) {
    return null;
  }

  return {
    r: parseInt(hexMatch[1].slice(0, 2), 16),
    g: parseInt(hexMatch[1].slice(2, 4), 16),
    b: parseInt(hexMatch[1].slice(4, 6), 16),
    alpha: 1,
  };
}

function parseRgbColor(color: string): LegendColorValue | null {
  const rgbMatch = color.trim().match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9]*\.?[0-9]+))?\s*\)$/i,
  );
  if (!rgbMatch) {
    return null;
  }

  return {
    r: clampChannel(Number.parseInt(rgbMatch[1], 10)),
    g: clampChannel(Number.parseInt(rgbMatch[2], 10)),
    b: clampChannel(Number.parseInt(rgbMatch[3], 10)),
    alpha: clampAlpha(rgbMatch[4] === undefined ? 1 : Number.parseFloat(rgbMatch[4])),
  };
}

export function parseLegendColor(color: string): LegendColorValue {
  return parseHexColor(color) ?? parseRgbColor(color) ?? { r: 0, g: 0, b: 0, alpha: 1 };
}

export function toLegendColorHex(color: LegendColorValue): string {
  return `#${formatHexChannel(color.r)}${formatHexChannel(color.g)}${formatHexChannel(color.b)}`;
}

export function withLegendHexColor(color: LegendColorValue, hexColor: string): LegendColorValue {
  const parsedHex = parseHexColor(hexColor);
  if (!parsedHex) {
    return color;
  }

  return {
    ...parsedHex,
    alpha: color.alpha,
  };
}

export function withLegendAlpha(color: LegendColorValue, alpha: number): LegendColorValue {
  return {
    ...color,
    alpha: clampAlpha(alpha),
  };
}

export function formatLegendColor(color: LegendColorValue): string {
  if (color.alpha >= 1) {
    return toLegendColorHex(color);
  }

  const alpha = Number(color.alpha.toFixed(2)).toString();
  return `rgba(${clampChannel(color.r)}, ${clampChannel(color.g)}, ${clampChannel(color.b)}, ${alpha})`;
}
