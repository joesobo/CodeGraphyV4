import { describe, expect, it } from 'vitest';
import type { GraphQueryData } from '../../../src/graphQuery/data';
import { analyzeGraphChangeImpact } from '../../../src/graphQuery/changeImpact/model';

function cloneData(): GraphQueryData {
  return structuredClone(data);
}

const data: GraphQueryData = {
  graphData: {
    nodes: [
      { id: 'package.json', label: 'package.json', nodeType: 'file' },
      { id: 'packages/core/package.json', label: 'package.json', nodeType: 'file' },
      { id: 'packages/app/package.json', label: 'package.json', nodeType: 'file' },
      { id: 'packages/core/src/model.ts', label: 'model.ts', nodeType: 'file' },
      {
        id: 'packages/core/src/model.ts#readModel:function',
        label: 'readModel',
        nodeType: 'symbol:function',
        symbol: {
          id: 'packages/core/src/model.ts#readModel:function',
          filePath: 'packages/core/src/model.ts',
          name: 'readModel',
          kind: 'function',
        },
      },
      { id: 'packages/app/src/controller.ts', label: 'controller.ts', nodeType: 'file' },
      {
        id: 'packages/app/src/controller.ts#run:function',
        label: 'run',
        nodeType: 'symbol:function',
        symbol: {
          id: 'packages/app/src/controller.ts#run:function',
          filePath: 'packages/app/src/controller.ts',
          name: 'run',
          kind: 'function',
        },
      },
      { id: 'packages/app/src/public.ts', label: 'public.ts', nodeType: 'file' },
      {
        id: 'packages/app/src/public.ts#run:alias',
        label: 'run',
        nodeType: 'symbol:alias',
        symbol: {
          id: 'packages/app/src/public.ts#run:alias',
          filePath: 'packages/app/src/public.ts',
          name: 'run',
          kind: 'alias',
        },
      },
      { id: 'packages/app/tests/controller.test.ts', label: 'controller.test.ts', nodeType: 'file' },
      {
        id: 'packages/app/tests/controller.test.ts#checksModel:function',
        label: 'checksModel',
        nodeType: 'symbol:function',
        symbol: {
          id: 'packages/app/tests/controller.test.ts#checksModel:function',
          filePath: 'packages/app/tests/controller.test.ts',
          name: 'checksModel',
          kind: 'function',
        },
      },
    ],
    edges: [
      {
        id: 'model-contains',
        from: 'packages/core/src/model.ts',
        to: 'packages/core/src/model.ts#readModel:function',
        kind: 'contains',
        sources: [],
      },
      {
        id: 'controller-contains',
        from: 'packages/app/src/controller.ts',
        to: 'packages/app/src/controller.ts#run:function',
        kind: 'contains',
        sources: [],
      },
      {
        id: 'public-contains',
        from: 'packages/app/src/public.ts',
        to: 'packages/app/src/public.ts#run:alias',
        kind: 'contains',
        sources: [],
      },
      {
        id: 'test-contains',
        from: 'packages/app/tests/controller.test.ts',
        to: 'packages/app/tests/controller.test.ts#checksModel:function',
        kind: 'contains',
        sources: [],
      },
      {
        id: 'controller-model',
        from: 'packages/app/src/controller.ts#run:function',
        to: 'packages/core/src/model.ts#readModel:function',
        kind: 'call',
        sources: [],
      },
      {
        id: 'public-controller',
        from: 'packages/app/src/public.ts#run:alias',
        to: 'packages/app/src/controller.ts#run:function',
        kind: 'reexport',
        sources: [],
      },
      {
        id: 'test-model',
        from: 'packages/app/tests/controller.test.ts#checksModel:function',
        to: 'packages/core/src/model.ts#readModel:function',
        kind: 'reference',
        sources: [],
      },
    ],
  },
  symbols: [
    {
      id: 'packages/core/src/model.ts#readModel:function',
      filePath: 'packages/core/src/model.ts',
      name: 'readModel',
      kind: 'function',
    },
    {
      id: 'packages/app/src/controller.ts#run:function',
      filePath: 'packages/app/src/controller.ts',
      name: 'run',
      kind: 'function',
    },
    {
      id: 'packages/app/src/public.ts#run:alias',
      filePath: 'packages/app/src/public.ts',
      name: 'run',
      kind: 'alias',
    },
    {
      id: 'packages/app/tests/controller.test.ts#checksModel:function',
      filePath: 'packages/app/tests/controller.test.ts',
      name: 'checksModel',
      kind: 'function',
    },
  ],
  cacheState: 'stale',
};

describe('core/graphQuery change impact', () => {
  it('explains bounded affected files, symbols, tests, and boundary crossings', () => {
    const report = analyzeGraphChangeImpact(data, {
      targets: ['packages/core/src/model.ts'],
      limit: 10,
      maxDepth: 3,
    });

    expect(report).toMatchObject({
      targets: [{
        path: 'packages/core/src/model.ts',
        nodeType: 'file',
        filePath: 'packages/core/src/model.ts',
      }],
      affected: [
        {
          path: 'packages/app/src/controller.ts',
          category: 'source',
          distance: 1,
          symbols: [{
            id: 'packages/app/src/controller.ts#run:function',
            name: 'run',
            kind: 'function',
          }],
          evidence: {
            nodes: [
              'packages/app/src/controller.ts#run:function',
              'packages/core/src/model.ts#readModel:function',
            ],
            relationships: [{
              from: 'packages/app/src/controller.ts#run:function',
              to: 'packages/core/src/model.ts#readModel:function',
              edgeType: 'call',
            }],
          },
        },
        {
          path: 'packages/app/tests/controller.test.ts',
          category: 'test',
          distance: 1,
        },
        {
          path: 'packages/app/src/public.ts',
          category: 'source',
          distance: 2,
        },
      ],
      tests: [{
        path: 'packages/app/tests/controller.test.ts',
        distance: 1,
      }],
      boundaries: {
        packages: [{
          from: 'packages/app',
          to: 'packages/core',
        }],
        public: [{
          from: 'packages/app/src/public.ts#run:alias',
          to: 'packages/app/src/controller.ts#run:function',
          edgeType: 'reexport',
        }],
      },
      limits: {
        maxDepth: 3,
        affectedFiles: 10,
        complete: true,
        truncationReasons: [],
      },
      sources: {
        graph: {
          freshness: 'cached',
          cacheState: 'stale',
        },
        ranking: {
          method: 'shortest incoming typed Relationship path, then source before test, then path',
        },
        heuristics: {
          tests: 'File path uses a tests directory or .test/.spec suffix',
          publicBoundaries: 'reexport Relationships only',
          packageBoundaries: 'nearest indexed package.json roots differ',
        },
      },
    });
  });

  it('accepts an exact Symbol id and reports invalid targets without partial results', () => {
    expect(analyzeGraphChangeImpact(data, {
      targets: ['packages/core/src/model.ts#readModel:function'],
    })).toMatchObject({
      targets: [{
        path: 'packages/core/src/model.ts#readModel:function',
        nodeType: 'symbol:function',
        filePath: 'packages/core/src/model.ts',
      }],
      affected: [
        { path: 'packages/app/src/controller.ts' },
        { path: 'packages/app/tests/controller.test.ts' },
        { path: 'packages/app/src/public.ts' },
      ],
    });

    const symbolOnlyInput = cloneData();
    symbolOnlyInput.graphData.nodes = symbolOnlyInput.graphData.nodes.filter(
      node => node.id !== 'packages/core/src/model.ts#readModel:function',
    );
    const symbolOnlyReport = analyzeGraphChangeImpact(symbolOnlyInput, {
      targets: ['packages/core/src/model.ts#readModel:function'],
    });
    expect(symbolOnlyReport.targets).toMatchObject([
      {
        path: 'packages/core/src/model.ts#readModel:function',
        nodeType: 'symbol:function',
        filePath: 'packages/core/src/model.ts',
      },
    ]);
    expect(symbolOnlyReport.affected[0]).toMatchObject({
      path: 'packages/app/src/controller.ts',
    });

    expect(analyzeGraphChangeImpact(data, {
      targets: ['packages/core/src/model.ts', 'missing.ts'],
    })).toMatchObject({
      targets: [{ path: 'packages/core/src/model.ts' }],
      affected: [],
      tests: [],
      boundaries: { packages: [], public: [] },
      limits: {
        complete: true,
        truncationReasons: [],
      },
      error: 'change_impact_target_not_found',
      missingTargets: ['missing.ts'],
    });

    expect(analyzeGraphChangeImpact(data, { targets: [] })).toMatchObject({
      error: 'change_impact_target_not_found',
      missingTargets: ['<target>'],
    });
  });

  it('reports result and traversal bounds that make the answer incomplete', () => {
    const report = analyzeGraphChangeImpact(data, {
      targets: ['packages/core/src/model.ts'],
      limit: 1,
      maxDepth: 1,
    });

    expect(report).toMatchObject({
      affected: [{ path: 'packages/app/src/controller.ts' }],
      tests: [],
      boundaries: {
        packages: [{ from: 'packages/app', to: 'packages/core' }],
        public: [],
      },
      limits: {
        maxDepth: 1,
        affectedFiles: 1,
        complete: false,
        truncationReasons: ['affected-files', 'max-depth'],
      },
    });
  });

  it('aggregates and sorts affected Symbols in the same File', () => {
    const input = cloneData();
    input.graphData.nodes.push({
      id: 'packages/app/src/controller.ts#load:function',
      label: 'load',
      nodeType: 'symbol:function',
      symbol: {
        id: 'packages/app/src/controller.ts#load:function',
        filePath: 'packages/app/src/controller.ts',
        name: 'load',
        kind: 'function',
      },
    });
    input.graphData.edges.push({
      id: 'load-model',
      from: 'packages/app/src/controller.ts#load:function',
      to: 'packages/core/src/model.ts#readModel:function',
      kind: 'call',
      sources: [],
    });

    expect(analyzeGraphChangeImpact(input, {
      targets: ['packages/core/src/model.ts'],
    }).affected[0]?.symbols.map(symbol => symbol.name)).toEqual(['load', 'run']);
  });

  it('prefers shorter evidence and normalizes invalid bounds to defaults', () => {
    const input = cloneData();
    input.graphData.edges.push({
      id: 'public-model',
      from: 'packages/app/src/public.ts#run:alias',
      to: 'packages/core/src/model.ts#readModel:function',
      kind: 'reference',
      sources: [],
    });

    expect(analyzeGraphChangeImpact(input, {
      targets: ['packages/core/src/model.ts'],
      limit: Number.NaN,
      maxDepth: 0,
    })).toMatchObject({
      affected: [
        { path: 'packages/app/src/controller.ts', distance: 1 },
        { path: 'packages/app/src/public.ts', distance: 1 },
        { path: 'packages/app/tests/controller.test.ts', distance: 1 },
      ],
      limits: {
        maxDepth: 3,
        affectedFiles: 20,
      },
    });
  });
});
