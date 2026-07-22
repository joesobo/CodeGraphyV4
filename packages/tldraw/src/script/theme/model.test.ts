import type { TLDefaultColor, TLTheme } from '@tldraw/tlschema';
import { describe, expect, it, vi } from 'vitest';
import { applyCodeGraphyTheme, TABLEAU_10 } from './model';

function color(value: string): TLDefaultColor {
  return {
    solid: value,
    semi: value,
    pattern: value,
    fill: value,
    linedFill: value,
    frameHeadingStroke: value,
    frameHeadingFill: value,
    frameStroke: value,
    frameFill: value,
    frameText: value,
    noteFill: value,
    noteText: value,
    highlightSrgb: value,
    highlightP3: value,
  };
}

function theme(): TLTheme {
  const palette = {
    text: '#111111', background: '#ffffff', negativeSpace: '#ffffff', solid: '#111111',
    cursor: '#111111', noteBorder: '#111111', snap: '#111111', selectionStroke: '#111111',
    selectionFill: '#ffffff', brushFill: '#ffffff', brushStroke: '#111111',
    selectedContrast: '#ffffff', laser: '#ff0000', black: color('#000000'),
    grey: color('#888888'), 'light-violet': color('#999999'), violet: color('#999999'),
    blue: color('#999999'), 'light-blue': color('#999999'), yellow: color('#999999'),
    orange: color('#999999'), green: color('#999999'), 'light-green': color('#999999'),
    'light-red': color('#999999'), red: color('#999999'), white: color('#ffffff'),
  } satisfies TLTheme['colors']['light'];
  return {
    id: 'default', fontSize: 16, lineHeight: 1.35, strokeWidth: 2, fonts: {},
    colors: { light: palette, dark: palette },
  } as TLTheme;
}

describe('CodeGraphy tldraw theme', () => {
  it('maps Tableau 10 onto native tldraw colors in both modes', () => {
    const current = theme();
    const updateTheme = vi.fn();

    applyCodeGraphyTheme({ getCurrentTheme: () => current, updateTheme });

    const next = updateTheme.mock.calls[0]?.[0] as TLTheme;
    expect(next.colors.light.blue.semi).toBe(TABLEAU_10[0]);
    expect(next.colors.light.grey.semi).toBe(TABLEAU_10[9]);
    expect(next.colors.dark.orange.semi).toBe(TABLEAU_10[1]);
    expect(next.colors.light.black).toBe(current.colors.light.black);
    expect(next.colors.dark.black).toBe(current.colors.dark.black);
  });
});
