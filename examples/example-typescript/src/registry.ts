import type { PaletteRecipe } from './types';

export function createPaletteRecord(recipe: PaletteRecipe): string {
  return `palette:${recipe.mood}:${recipe.theme}`;
}
