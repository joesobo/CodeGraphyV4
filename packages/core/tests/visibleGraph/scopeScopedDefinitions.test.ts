import { describe, expect, it } from 'vitest';
import { getDisabledScopedSymbolDefinitions } from '../../src/visibleGraph/scopeScopedDefinitions';
import type { VisibleGraphScopeConfig } from '../../src/visibleGraph/contracts';

function scope(nodes: VisibleGraphScopeConfig['nodes']): VisibleGraphScopeConfig {
  return { nodes, edges: [] };
}

describe('visibleGraph/scopeScopedDefinitions', () => {
  it('includes scoped symbol definitions under disabled parent node types', () => {
    expect(getDisabledScopedSymbolDefinitions(scope([
      { type: 'variable', enabled: false },
    ])).map((definition) => definition.id)).toEqual([
      'plugin:codegraphy.gdscript:symbol:godot-class-name',
    ]);
  });

  it('includes a disabled scoped symbol definition directly', () => {
    expect(getDisabledScopedSymbolDefinitions(scope([
      { type: 'variable', enabled: true },
      { type: 'plugin:codegraphy.gdscript:symbol:godot-class-name', enabled: false },
    ])).map((definition) => definition.id)).toEqual([
      'plugin:codegraphy.gdscript:symbol:godot-class-name',
    ]);
  });

  it('ignores disabled regular symbol kinds and non-scoped file types', () => {
    expect(getDisabledScopedSymbolDefinitions(scope([
      { type: 'symbol:function', enabled: false },
      { type: 'folder', enabled: false },
      { type: 'package', enabled: false },
    ]))).toEqual([]);
  });
});
