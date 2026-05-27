export interface LegendColorValue {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

export function createDefaultLegendColor(): LegendColorValue {
  return { r: 0, g: 0, b: 0, alpha: 1 };
}
