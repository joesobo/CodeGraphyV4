import { loadThemePack } from '#example/themePack';
import ThemeLabels from './themeLabels';
import { normalizeMood } from './types';
import type { PaletteMood, PaletteRecipe } from './types';
import { buildPalette } from './palette';

export const currentMood: PaletteMood = normalizeMood('sunset');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const seedSettings = require('./seedSettings');

export { createPaletteRecord } from './registry';

const schedulePreview = async (recipe: PaletteRecipe): Promise<void> => {
  const lazyPreview = await import('./lazyPreview');
  lazyPreview.renderLazyPreview(recipe);
};

console.log(buildPalette(currentMood));
console.log(loadThemePack(currentMood));
console.log(ThemeLabels.describeTheme(seedSettings.theme));
void schedulePreview({ mood: currentMood, theme: seedSettings.theme });
