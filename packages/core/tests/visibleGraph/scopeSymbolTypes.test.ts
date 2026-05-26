import { describe, expect, it } from 'vitest';
import { getDisabledSymbolKinds } from '../../src/visibleGraph/scopeSymbolTypes';
import type { VisibleGraphScopeConfig } from '../../src/visibleGraph/contracts';

function scope(nodes: VisibleGraphScopeConfig['nodes']): VisibleGraphScopeConfig {
  return { nodes, edges: [] };
}

describe('visibleGraph/scopeSymbolTypes', () => {
  it('expands disabled symbol types that define multiple symbol kinds', () => {
    expect(getDisabledSymbolKinds(scope([
      { type: 'symbol:function', enabled: false },
    ]))).toEqual(new Set(['function', 'method']));
  });

  it('falls back to the symbol type suffix when no explicit kinds exist', () => {
    expect(getDisabledSymbolKinds(scope([
      { type: 'symbol:class', enabled: false },
      { type: 'symbol:interface', enabled: true },
      { type: 'symbol:unknown', enabled: false },
    ]))).toEqual(new Set(['class', 'unknown']));
  });

  it('ignores disabled non-symbol node types', () => {
    expect(getDisabledSymbolKinds(scope([
      { type: 'variable', enabled: false },
      { type: 'file', enabled: false },
    ]))).toEqual(new Set());
  });
});
