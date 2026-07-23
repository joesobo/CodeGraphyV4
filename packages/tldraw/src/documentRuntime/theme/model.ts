import type { TLDefaultColor, TLTheme } from '@tldraw/tlschema';
import { NODE_COLOR_TOKENS } from '../../document/nodeColor/model';

export const CODEGRAPHY_COOL_10 = [
  '#4C78A8',
  '#5B8FF9',
  '#4C9FBE',
  '#55A7A0',
  '#5A9F7B',
  '#7B78B8',
  '#9575B8',
  '#B279A2',
  '#70849B',
  '#A2ABB8',
] as const;

const CODEGRAPHY_COOL_10_OUTLINES = [
  '#355476',
  '#3F64AE',
  '#356F85',
  '#3B7570',
  '#3F6F56',
  '#565480',
  '#68517F',
  '#7C5571',
  '#4E5C6C',
  '#717882',
] as const;

interface ThemeEditor {
  getCurrentTheme?(): TLTheme;
  updateTheme?(theme: TLTheme): unknown;
}

function paletteColor(
  previous: TLDefaultColor,
  fill: string,
  outline: string,
): TLDefaultColor {
  return {
    ...previous,
    solid: outline,
    semi: fill,
    pattern: fill,
    fill,
    linedFill: fill,
    highlightSrgb: fill,
    highlightP3: fill,
  };
}

function themedColors(colors: TLTheme['colors']['light']): TLTheme['colors']['light'] {
  const next = { ...colors };
  for (const [index, token] of NODE_COLOR_TOKENS.entries()) {
    next[token] = paletteColor(
      colors[token],
      CODEGRAPHY_COOL_10[index],
      CODEGRAPHY_COOL_10_OUTLINES[index],
    );
  }
  return next;
}

export function applyCodeGraphyTheme(editor: ThemeEditor): void {
  if (!editor.getCurrentTheme || !editor.updateTheme) return;
  const current = editor.getCurrentTheme();
  editor.updateTheme({
    ...current,
    colors: {
      light: themedColors(current.colors.light),
      dark: themedColors(current.colors.dark),
    },
  });
}
