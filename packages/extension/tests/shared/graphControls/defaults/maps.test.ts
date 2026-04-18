import { describe, expect, it } from 'vitest';
import {
  createDefaultEdgeColors,
  createDefaultEdgeVisibility,
  createDefaultNodeColors,
  createDefaultNodeVisibility,
} from '../../../../src/shared/graphControls/defaults/maps';

describe('shared/graphControls/defaults/maps', () => {
  it('builds default visibility and color maps from the shared definitions', () => {
    expect(createDefaultNodeVisibility()).toEqual({
      file: true,
      folder: false,
      package: false,
    });
    expect(createDefaultEdgeVisibility().import).toBe(true);
    expect(createDefaultNodeColors().file).toBeTruthy();
    expect(createDefaultEdgeColors().call).toBeTruthy();
  });
});
