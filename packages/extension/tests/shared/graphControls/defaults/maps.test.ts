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
      'symbol:method': true,
      'symbol:class': true,
      'symbol:interface': true,
      'symbol:type': true,
      'symbol:struct': true,
      'symbol:enum': true,
      'symbol:namespace': true,
      variable: false,
      'symbol:variable': true,
      'symbol:constant': true,
      'symbol:property': true,
    });
    expect(createDefaultEdgeVisibility().import).toBe(true);
    expect(createDefaultNodeColors().file).toBeTruthy();
    expect(createDefaultEdgeColors().call).toBeTruthy();
  });
});
