import { describe, expect, it } from 'vitest';
import type { IGraphEdge } from '../../../../../src/shared/graph/contracts';
import { applyEdgeLegendRules } from '../../../../../src/webview/search/filtering/rules/edges';

describe('search/filtering/rules/edges', () => {
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

  it('treats missing targets as node rules even when the edge fields match', () => {
    const edge: IGraphEdge = {
      id: 'edge-3',
      from: 'src/main.ts',
      to: 'src/helper.ts',
      kind: 'import',
      sources: [],
    };

    expect(applyEdgeLegendRules(edge, [
      { id: 'default-target', pattern: 'src/main.ts->src/helper.ts', color: '#44ff44' },
      { id: 'node-target', pattern: 'src/main.ts->src/helper.ts#import', color: '#ff44ff', target: 'node' as const },
    ])).toEqual(edge);
  });

  it('matches edge rules by full path and full path with kind', () => {
    const edge: IGraphEdge = {
      id: 'edge-4',
      from: 'src/main.ts',
      to: 'src/helper.ts',
      kind: 'import',
      sources: [],
    };

    expect(applyEdgeLegendRules(edge, [
      { id: 'path-only', pattern: 'src/main.ts->src/helper.ts', color: '#112233', target: 'edge' as const },
      { id: 'path-kind', pattern: 'src/main.ts->src/helper.ts#import', color: '#334455', target: 'edge' as const },
    ])).toMatchObject({
      color: '#334455',
    });
  });
});
