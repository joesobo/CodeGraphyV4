import { describe, expect, it } from 'vitest';
import {
  isPluginScopedGraphEdgeKind,
  isPluginScopedGraphNodeType,
} from '../../../../src/shared/graphControls/pluginScope/model';

describe('shared/graphControls/pluginScope/model', () => {
  it('identifies plugin-owned Node Types by their namespace', () => {
    expect(isPluginScopedGraphNodeType('plugin:codegraphy.unity:symbol')).toBe(true);
    expect(isPluginScopedGraphNodeType('symbol:function')).toBe(false);
  });

  it('identifies plugin-owned Edge Types by their namespace separator', () => {
    expect(isPluginScopedGraphEdgeKind('codegraphy.typescript:alias-import')).toBe(true);
    expect(isPluginScopedGraphEdgeKind('import')).toBe(false);
  });
});
