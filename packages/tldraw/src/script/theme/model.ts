import type { TLDefaultColor, TLTheme } from '@tldraw/tlschema';
import { NODE_COLOR_TOKENS } from '../../document/nodeColor/model';

export const TABLEAU_10 = [
  '#4E79A7',
  '#F28E2B',
  '#E15759',
  '#76B7B2',
  '#59A14F',
  '#EDC948',
  '#B07AA1',
  '#FF9DA7',
  '#9C755F',
  '#BAB0AC',
] as const;

const TABLEAU_10_OUTLINES = [
  '#375576',
  '#A7601D',
  '#9D3D3F',
  '#51807D',
  '#3E7138',
  '#A88D31',
  '#7B5571',
  '#B36E74',
  '#6D523F',
  '#827B78',
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
      TABLEAU_10[index],
      TABLEAU_10_OUTLINES[index],
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
