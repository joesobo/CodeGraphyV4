import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../src/graph/contracts';
import { impactGraphTarget } from '../../src/graphQuery/impact';

const graphData: IGraphData = {
  nodes: [
    { id: 'src/registry.ts', label: 'registry.ts', nodeType: 'file' },
    {
      id: 'src/registry.ts#dispose:function',
      label: 'dispose',
      nodeType: 'symbol:function',
      symbol: { id: 'src/registry.ts#dispose:function', filePath: 'src/registry.ts', name: 'dispose', kind: 'function' },
    },
    { id: 'src/a-types.ts', label: 'a-types.ts', nodeType: 'file' },
    { id: 'src/engine.ts', label: 'engine.ts', nodeType: 'file' },
    {
      id: 'src/engine.ts#rebuild:function',
      label: 'rebuild',
      nodeType: 'symbol:function',
      symbol: { id: 'src/engine.ts#rebuild:function', filePath: 'src/engine.ts', name: 'rebuild', kind: 'function' },
    },
    {
      id: 'src/engine.ts#register:function',
      label: 'register',
      nodeType: 'symbol:function',
      symbol: { id: 'src/engine.ts#register:function', filePath: 'src/engine.ts', name: 'register', kind: 'function' },
    },
    { id: 'src/workspace.ts', label: 'workspace.ts', nodeType: 'file' },
    { id: 'tests/lifecycle.test.ts', label: 'lifecycle.test.ts', nodeType: 'file' },
  ],
  edges: [
    { id: 'contains-registry', from: 'src/registry.ts', to: 'src/registry.ts#dispose:function', kind: 'contains', sources: [] },
    { id: 'contains-engine', from: 'src/engine.ts', to: 'src/engine.ts#rebuild:function', kind: 'contains', sources: [] },
    { id: 'contains-engine-register', from: 'src/engine.ts', to: 'src/engine.ts#register:function', kind: 'contains', sources: [] },
    { id: 'types-import-registry', from: 'src/a-types.ts', to: 'src/registry.ts', kind: 'type-import', sources: [] },
    { id: 'engine-calls-dispose', from: 'src/engine.ts#rebuild:function', to: 'src/registry.ts#dispose:function', kind: 'call', sources: [] },
    { id: 'workspace-calls-register', from: 'src/workspace.ts', to: 'src/engine.ts#register:function', kind: 'call', sources: [] },
    { id: 'test-imports-registry', from: 'tests/lifecycle.test.ts', to: 'src/registry.ts', kind: 'import', sources: [] },
    { id: 'cycle', from: 'src/registry.ts', to: 'src/workspace.ts', kind: 'reference', sources: [] },
  ],
};

describe('core/graphQuery impact', () => {
  it('returns a bounded incoming File radius with typed reasons and shortest distance', () => {
    expect(impactGraphTarget({ graphData }, {
      target: 'src/registry.ts',
      maxDepth: 2,
      limit: 10,
    })).toEqual({
      target: { path: 'src/registry.ts', nodeType: 'file' },
      impacted: [
        { path: 'src/engine.ts', nodeType: 'file', distance: 1, edgeTypes: ['call'] },
        { path: 'src/workspace.ts', nodeType: 'file', distance: 2, edgeTypes: ['call'] },
        { path: 'tests/lifecycle.test.ts', nodeType: 'file', distance: 1, edgeTypes: ['import'] },
        { path: 'src/a-types.ts', nodeType: 'file', distance: 1, edgeTypes: ['type-import'] },
      ],
      page: { offset: 0, limit: 10, returned: 4, total: 4, nextOffset: null },
      limits: { maxDepth: 2, visitedNodes: 6, complete: true },
    });
  });

  it('accepts an exact Symbol target and paginates one deterministic radius', () => {
    const complete = impactGraphTarget({ graphData }, {
      target: 'src/registry.ts#dispose:function',
      maxDepth: 2,
      limit: 10,
    });
    const page = impactGraphTarget({ graphData }, {
      target: 'src/registry.ts#dispose:function',
      maxDepth: 2,
      limit: 1,
      offset: 1,
    });

    expect('impacted' in complete ? complete.impacted.map(item => item.path) : []).toEqual([
      'src/engine.ts',
      'src/workspace.ts',
    ]);
    expect('impacted' in page ? page.impacted : []).toEqual(
      'impacted' in complete ? complete.impacted.slice(1, 2) : [],
    );
  });

  it('reports an exact target that is absent', () => {
    expect(impactGraphTarget({ graphData }, {
      target: 'src/missing.ts',
      maxDepth: 2,
      limit: 10,
    })).toEqual({
      error: 'query_target_not_found',
      message: 'No indexed Node or Symbol has the exact id: src/missing.ts',
    });
  });
});
