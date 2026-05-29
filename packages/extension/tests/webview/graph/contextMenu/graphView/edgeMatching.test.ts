import { describe, expect, it } from 'vitest';
import { edgeMatches } from '../../../../../src/webview/components/graph/contextMenu/graphView/edgeMatching';

describe('graphView edge matching', () => {
  it('does not match missing edges', () => {
    expect(edgeMatches(undefined, { kind: 'edge', edgeKinds: ['import'] })).toBe(false);
    expect(edgeMatches(undefined, { kind: 'runtimeEdgeType', runtimeEdgeTypes: ['runtime-link'] })).toBe(false);
  });

  it('matches runtime edge type selectors only by runtime edge type', () => {
    expect(edgeMatches(
      { id: 'a->b#import', kind: 'import', runtimeEdgeType: 'runtime-link' },
      { kind: 'runtimeEdgeType', runtimeEdgeTypes: ['runtime-link'] },
    )).toBe(true);
    expect(edgeMatches(
      { id: 'a->b#import', kind: 'runtime-link' },
      { kind: 'runtimeEdgeType', runtimeEdgeTypes: ['runtime-link'] },
    )).toBe(false);
  });

  it('requires regular edge selectors to satisfy kind and runtime edge filters', () => {
    const selector = { kind: 'edge' as const, edgeKinds: ['import'] as const, runtimeEdgeTypes: ['runtime-link'] };

    expect(edgeMatches({ id: 'a->b#import', kind: 'import', runtimeEdgeType: 'runtime-link' }, selector)).toBe(true);
    expect(edgeMatches({ id: 'a->b#import', kind: 'reference', runtimeEdgeType: 'runtime-link' }, selector)).toBe(false);
    expect(edgeMatches({ id: 'a->b#import', kind: 'import', runtimeEdgeType: 'other' }, selector)).toBe(false);
  });

  it('allows missing selector filters', () => {
    expect(edgeMatches({ id: 'a->b#import' }, { kind: 'edge' })).toBe(true);
  });
});
