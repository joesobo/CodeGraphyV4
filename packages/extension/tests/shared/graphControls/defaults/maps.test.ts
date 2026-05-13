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
      symbol: false,
      'symbol:function': true,
      'symbol:class': true,
      'symbol:interface': true,
      'symbol:type': true,
      'symbol:struct': true,
      'symbol:enum': true,
      variable: false,
      'symbol:constant': true,
      'plugin:codegraphy.gdscript:symbol:godot-class-name': true,
    });
    expect(createDefaultEdgeVisibility().import).toBe(true);
    expect(createDefaultNodeColors().file).toBeTruthy();
    expect(createDefaultNodeColors().symbol).toBe('#7C3AED');
    expect(createDefaultEdgeColors().call).toBeTruthy();
  });
});
