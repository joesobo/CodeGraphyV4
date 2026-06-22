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
      'symbol:function': false,
      'symbol:namespace': false,
      'symbol:callable': false,
      'symbol:method': false,
      'symbol:constructor': false,
      'symbol:prototype': false,
      'symbol:class': false,
      'symbol:mixin': false,
      'symbol:extension': false,
      'symbol:interface': false,
      'symbol:record': false,
      'symbol:delegate': false,
      'symbol:property': false,
      'symbol:event': false,
      'symbol:type': false,
      'symbol:struct': false,
      'symbol:union': false,
      'symbol:enum': false,
      'symbol:typedef': false,
      'symbol:alias': false,
      'symbol:template': false,
      'plugin:codegraphy.gdscript:symbol:scene': false,
      'plugin:codegraphy.gdscript:symbol:resource': false,
      'plugin:codegraphy.gdscript:symbol:autoload': false,
      'plugin:codegraphy.gdscript:symbol:scene-node': false,
      'plugin:codegraphy.gdscript:symbol:signal': false,
      variable: false,
      'variable:plain': false,
      'symbol:constant': false,
      'symbol:global': false,
      'symbol:field': false,
      'symbol:parameter': false,
      'symbol:local': false,
      'plugin:codegraphy.gdscript:symbol:godot-class-name': false,
      'plugin:codegraphy.unity:symbol': false,
      'plugin:codegraphy.unity:symbol:game-object': false,
      'plugin:codegraphy.unity:symbol:component': false,
      'plugin:codegraphy.gdscript:symbol:exported-property': false,
    });
    expect(createDefaultEdgeVisibility().import).toBe(true);
    expect(createDefaultEdgeVisibility()['using']).toBe(true);
    expect(createDefaultEdgeVisibility()['type']).toBe(false);
    expect(createDefaultNodeColors().file).toBeTruthy();
    expect(createDefaultNodeColors().symbol).toBe('#7C3AED');
    expect(createDefaultNodeColors()['plugin:codegraphy.unity:symbol:game-object']).toBe('#0EA5E9');
    expect(createDefaultEdgeColors().call).toBeTruthy();
    expect(createDefaultEdgeColors()['call']).toBe('#22C55E');
  });
});
