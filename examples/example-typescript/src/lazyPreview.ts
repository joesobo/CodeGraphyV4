import type { PaletteRecipe } from './types';

export function renderLazyPreview(recipe: PaletteRecipe): string {
  return `${recipe.mood}:${recipe.theme}`;
}
