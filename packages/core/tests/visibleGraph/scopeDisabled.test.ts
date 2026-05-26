import { describe, expect, it } from 'vitest';
import { getDisabledNodeTypes } from '../../src/visibleGraph/scopeDisabled';
import type { VisibleGraphScopeConfig } from '../../src/visibleGraph/contracts';

function scope(nodes: VisibleGraphScopeConfig['nodes']): VisibleGraphScopeConfig {
  return { nodes, edges: [] };
}

describe('visibleGraph/scopeDisabled', () => {
  it('disables variable nodes whenever the symbol root is disabled', () => {
    expect(getDisabledNodeTypes(scope([
      { type: 'symbol', enabled: false },
      { type: 'variable', enabled: true },
    ]))).toEqual(new Set(['symbol', 'variable']));
  });

  it('keeps regular disabled node types when the symbol root is enabled', () => {
    expect(getDisabledNodeTypes(scope([
      { type: 'symbol', enabled: true },
      { type: 'variable', enabled: false },
      { type: 'folder', enabled: false },
    ]))).toEqual(new Set(['variable', 'folder']));
  });

  it('does not infer symbol root state from unrelated disabled types', () => {
    expect(getDisabledNodeTypes(scope([
      { type: 'folder', enabled: false },
    ]))).toEqual(new Set(['folder']));
  });
});
