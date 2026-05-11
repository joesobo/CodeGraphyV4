import { describe, expect, it } from 'vitest';
import {
  createDefaultEdgeColors,
  createDefaultEdgeVisibility,
  createDefaultNodeColors,
  createDefaultNodeColorEnabled,
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
      'symbol:property': true,
      'plugin:codegraphy.gdscript:symbol:godot-class-name': true,
    });
    expect(createDefaultEdgeVisibility().import).toBe(true);
    expect(createDefaultNodeColors().file).toBeTruthy();
    expect(createDefaultNodeColors().symbol).toBe('#A1A1AA');
    expect(createDefaultNodeColorEnabled().symbol).toBe(false);
    expect(createDefaultEdgeColors().call).toBeTruthy();
  });
});
