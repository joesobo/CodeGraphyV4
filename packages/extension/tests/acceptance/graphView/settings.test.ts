import { describe, expect, it } from 'vitest';
import { extensionFavoritesFromSettings } from './settings';

describe('extensionFavoritesFromSettings', () => {
  it('reads favorites from the CodeGraphy Extension interface entry', () => {
    expect(extensionFavoritesFromSettings({
      interfaces: [
        { id: 'future.interface', data: { favorites: ['wrong.ts'] } },
        { id: 'codegraphy.extension', data: { favorites: ['src/index.ts'] } },
      ],
    })).toEqual(['src/index.ts']);
  });

  it.each([
    {},
    { favorites: ['legacy.ts'] },
    { interfaces: [{ id: 'codegraphy.extension', data: { favorites: 'invalid' } }] },
  ])('returns no favorites for settings without a valid Extension favorites list', (settings) => {
    expect(extensionFavoritesFromSettings(settings)).toEqual([]);
  });
});
