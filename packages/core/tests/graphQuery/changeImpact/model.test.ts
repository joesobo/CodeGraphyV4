import { describe, expect, it } from 'vitest';
import type { GraphQueryData } from '../../../src/graphQuery/data';
import { analyzeGraphChangeImpact } from '../../../src/graphQuery/changeImpact/model';

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
      },
    });
  });
});
