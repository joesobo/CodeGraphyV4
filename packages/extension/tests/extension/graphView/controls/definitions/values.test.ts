import { describe, expect, it } from 'vitest';
import {
  resolveNodeColors,
  resolveVisibilityMap,
} from '../../../../../src/extension/graphView/controls/send/definitions/values';

describe('extension/graphView/controls/send/definitions/values', () => {
  it('prefers configured boolean visibility values and falls back to defaults otherwise', () => {
    expect(
      resolveVisibilityMap(
        [
          { id: 'file', defaultVisible: true },
          { id: 'folder', defaultVisible: false },
          { id: 'route', defaultVisible: true },
        ],
        {
          file: false,
          folder: true,
          route: 'yes',
        },
      ),
    ).toEqual({
      file: false,
      folder: true,
      route: true,
    });
  });

  it('normalizes configured node colors and falls back to defaults for invalid values', () => {
    expect(
      resolveNodeColors(
        [
          { id: 'file', label: 'Files', defaultColor: '#A1A1AA', defaultVisible: true },
          { id: 'route', label: 'Routes', defaultColor: '#22C55E', defaultVisible: true },
          { id: 'package', label: 'Packages', defaultColor: '#F59E0B', defaultVisible: false },
        ],
        {
          file: '  #abcdef  ',
          route: {},
          package: 123,
        },
      ),
    ).toEqual({
      file: '#ABCDEF',
      route: '#22C55E',
      package: '#F59E0B',
    });
  });
});
