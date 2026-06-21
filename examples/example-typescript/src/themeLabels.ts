import type { PaletteTheme } from './types';

const ThemeLabels = {
  describeTheme(theme: PaletteTheme): string {
    return `theme:${theme}`;
  },
};

export default ThemeLabels;
