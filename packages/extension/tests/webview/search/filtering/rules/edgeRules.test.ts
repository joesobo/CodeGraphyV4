import { describe, expect, it } from 'vitest';
import type { IGraphEdge } from '../../../../../src/shared/graph/types';
import { applyEdgeLegendRules } from '../../../../../src/webview/search/filtering/rules/edgeRules';

describe('search/filtering/rules/edgeRules', () => {
  it('colors edges that match edge-targeted rules by id kind or path', () => {
    const edge: IGraphEdge = {
      id: 'edge-1',
      from: 'src/App.ts',
      to: 'src/util.ts',
      kind: 'import',
      sources: [],
    };
    const activeRules = [
      { id: 'nodes-only', pattern: 'src/**', color: '#00ff00', target: 'node' as const },
      { id: 'edge-kind', pattern: 'import', color: '#ff8800', target: 'edge' as const },
    ];

    expect(applyEdgeLegendRules(edge, activeRules)).toMatchObject({
      color: '#ff8800',
    });
  });

  it('leaves edges unchanged when no edge-targeted rule matches', () => {
    const edge: IGraphEdge = {
      id: 'edge-2',
      from: 'src/util.ts',
      to: 'README.md',
      kind: 'import',
      sources: [],
    };

    expect(applyEdgeLegendRules(edge, [
      { id: 'other-edge', pattern: 'call', color: '#ff8800', target: 'edge' as const },
    ])).toEqual(edge);
  });
});
