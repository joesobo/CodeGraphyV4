export enum PaletteTheme {
  Sunrise = 'sunrise',
  Neon = 'neon',
}

export type PaletteMood = string;

export interface PaletteRecipe {
  mood: PaletteMood;
  theme: PaletteTheme;
}

export function normalizeMood(name: string): string {
  return name.trim().toLowerCase();
}
