import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IColorGenerationOptions } from '../../../src/core/colors/ColorPaletteManager';
import { ColorPaletteManager, DEFAULT_FALLBACK_COLOR } from '../../../src/core/colors/ColorPaletteManager';

const { distinctColorsMock } = vi.hoisted(() => ({
  distinctColorsMock: vi.fn((options: { count: number }) =>
    Array.from({ length: options.count }, (_, index) => ({
      hex: () => `#${index.toString(16).padStart(6, '0')}`,
    }))
  ),
}));

vi.mock('distinct-colors', () => ({
  default: distinctColorsMock,
}));

describe('ColorPaletteManager generation', () => {
  beforeEach(() => {
    distinctColorsMock.mockClear();
  });

  it('assigns colors from alphabetically sorted normalized extensions', () => {
    const manager = new ColorPaletteManager();

    manager.generateForExtensions(['TS', '.css', ' js ']);

    expect(manager.getColor('.css')).toBe('#000000');
    expect(manager.getColor('.js')).toBe('#000001');
    expect(manager.getColor('.ts')).toBe('#000002');
  });

  it('deduplicates normalized extensions before requesting a palette', () => {
    const manager = new ColorPaletteManager();

    manager.generateForExtensions([' TS ', 'ts', '.JS', 'js']);

    expect(distinctColorsMock).toHaveBeenCalledWith({
      count: 2,
      lightMin: 60,
      lightMax: 85,
      chromaMin: 40,
      chromaMax: 70,
    } satisfies Required<IColorGenerationOptions> & { count: number });
  });

  it('keeps the existing generated palette when asked to generate nothing', () => {
    const manager = new ColorPaletteManager();

    manager.generateForExtensions(['.ts']);
    const existingColor = manager.getColor('.ts');

    manager.generateForExtensions([]);

    expect(manager.getColor('.ts')).toBe(existingColor);
    expect(distinctColorsMock).toHaveBeenCalledTimes(1);
  });

  it('forwards custom palette options to distinct-colors', () => {
    const manager = new ColorPaletteManager({
      lightMin: 50,
      lightMax: 60,
      chromaMin: 80,
      chromaMax: 90,
    });

    manager.generateForExtensions(['.ts']);

    expect(distinctColorsMock).toHaveBeenCalledWith({
      count: 1,
      lightMin: 50,
      lightMax: 60,
      chromaMin: 80,
      chromaMax: 90,
    });
  });

  it('returns the fallback color for unknown extensions', () => {
    const manager = new ColorPaletteManager();

    expect(manager.getColor('.unknown')).toBe(DEFAULT_FALLBACK_COLOR);
  });
});
