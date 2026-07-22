import { describe, expect, it } from 'vitest';
import { resolveGraphQueryNodeTypes } from '../../../src/graphQuery/nodeTypeProjection/model';

describe('graph query Node Type projection', () => {
  it('uses the exact projected Node Types before Graph Scope defaults', () => {
    expect(resolveGraphQueryNodeTypes({
      projectedNodeTypes: ['symbol:function'],
      scopeTypes: { file: true, symbol: true, 'symbol:function': true },
    })).toEqual(new Set(['symbol:function']));
  });

  it('preserves an explicit empty projection', () => {
    expect(resolveGraphQueryNodeTypes({
      projectedNodeTypes: [],
      scopeTypes: { file: true },
    })).toEqual(new Set());
  });

  it('uses enabled persisted scope types without a projection', () => {
    expect(resolveGraphQueryNodeTypes({
      scopeTypes: { file: false, symbol: true, 'symbol:function': false },
    })).toEqual(new Set(['symbol']));
  });

  it('defaults to file nodes when no scope is present', () => {
    expect(resolveGraphQueryNodeTypes({})).toEqual(new Set(['file']));
  });

});
