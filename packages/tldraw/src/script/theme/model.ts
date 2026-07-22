import type { TLDefaultColor, TLTheme } from '@tldraw/tlschema';
import { NODE_COLOR_TOKENS } from '../../document/nodeColor/model';

export const OBSERVABLE_10 = [
  '#4269D0',
  '#EFB118',
  '#FF725C',
  '#6CC5B0',
  '#3CA951',
  '#FF8AB7',
  '#A463F2',
  '#97BBF5',
  '#9C6B4E',
  '#9498A0',
] as const;

const OBSERVABLE_10_OUTLINES = [
  '#2F4A94',
  '#A77911',
  '#B85042',
  '#4B897B',
  '#2A7639',
  '#B36080',
  '#7044A8',
  '#6982AC',
  '#6D4B37',
  '#686A70',
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
      OBSERVABLE_10[index],
      OBSERVABLE_10_OUTLINES[index],
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
