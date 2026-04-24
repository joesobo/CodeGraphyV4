import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadQueryContext } from '../../src/query/load';
import { readImpactSet } from '../../src/query/impactSet';
import type { DatabaseSnapshot } from '../../src/database/model';
import { createTempCodeGraphyHome, createTempRepo } from '../support/database';
import { createSampleSnapshot } from '../support/sampleGraph';

function createTypeRefactorSnapshot(): DatabaseSnapshot {
  return {
    files: [],
    symbols: [
      {
        id: 'symbol:packages/shared/src/types.ts:type:UserName',
        name: 'UserName',
        kind: 'type',
        filePath: 'packages/shared/src/types.ts',
      },
      {
        id: 'symbol:packages/shared/src/types.ts:function:formatUser',
        name: 'formatUser',
        kind: 'function',
        filePath: 'packages/shared/src/types.ts',
      },
      {
        id: 'symbol:packages/app/src/index.ts:function:bootstrap',
        name: 'bootstrap',
        kind: 'function',
        filePath: 'packages/app/src/index.ts',
      },
      {
        id: 'symbol:packages/app/src/utils.ts:function:normalizeUser',
        name: 'normalizeUser',
        kind: 'function',
        filePath: 'packages/app/src/utils.ts',
      },
    ],
    relations: [
      {
        kind: 'type-import',
        sourceId: 'ts:type-import',
        fromFilePath: 'packages/app/src/index.ts',
        toFilePath: 'packages/shared/src/types.ts',
        fromSymbolId: 'symbol:packages/app/src/index.ts:function:bootstrap',
        toSymbolId: 'symbol:packages/shared/src/types.ts:type:UserName',
      },
      {
        kind: 'call',
        sourceId: 'ts:call',
        fromFilePath: 'packages/app/src/utils.ts',
        toFilePath: 'packages/shared/src/types.ts',
        fromSymbolId: 'symbol:packages/app/src/utils.ts:function:normalizeUser',
        toSymbolId: 'symbol:packages/shared/src/types.ts:function:formatUser',
      },
    ],
  };
}

describe('query/impactSet', () => {
  let originalHome: string | undefined;

  beforeEach(() => {
    originalHome = process.env.CODEGRAPHY_HOME;
    process.env.CODEGRAPHY_HOME = createTempCodeGraphyHome();
  });

  afterEach(() => {
    process.env.CODEGRAPHY_HOME = originalHome;
  });

  it('walks a bounded transitive symbol impact path', () => {
    const repo = createTempRepo(createSampleSnapshot());
    const context = loadQueryContext(repo.workspaceRoot);

    const result = readImpactSet('symbol:src/c.ts:runner', context, { maxDepth: 2 });

    expect(result.summary).toMatchObject({
      seedId: 'symbol:src/c.ts:runner',
      relationCount: 2,
    });
    expect(result.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([
      'symbol:src/c.ts:runner',
      'symbol:src/b.ts:useExport',
      'symbol:src/a.ts:exportAsJson',
    ]));
  });

  it('defaults file-seeded impact traversal to incoming dependents', () => {
    const repo = createTempRepo(createTypeRefactorSnapshot());
    const context = loadQueryContext(repo.workspaceRoot);

    const result = readImpactSet('packages/shared/src/types.ts', context);

    expect(result.summary).toMatchObject({
      seedId: 'packages/shared/src/types.ts',
      direction: 'incoming',
      relationCount: 2,
    });
    expect(result.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([
      'packages/shared/src/types.ts',
      'symbol:packages/shared/src/types.ts:type:UserName',
      'symbol:packages/shared/src/types.ts:function:formatUser',
      'symbol:packages/app/src/index.ts:function:bootstrap',
      'symbol:packages/app/src/utils.ts:function:normalizeUser',
    ]));
    expect(result.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'type-import',
        from: 'symbol:packages/app/src/index.ts:function:bootstrap',
        to: 'symbol:packages/shared/src/types.ts:type:UserName',
      }),
      expect.objectContaining({
        kind: 'call',
        from: 'symbol:packages/app/src/utils.ts:function:normalizeUser',
        to: 'symbol:packages/shared/src/types.ts:function:formatUser',
      }),
    ]));
  });

  it('supports kind filters so agents can reduce noise during impact analysis', () => {
    const repo = createTempRepo(createTypeRefactorSnapshot());
    const context = loadQueryContext(repo.workspaceRoot);

    const result = readImpactSet('packages/shared/src/types.ts', context, {
      kinds: ['type-import'],
    });

    expect(result.summary).toMatchObject({
      relationCount: 1,
      kinds: ['type-import'],
    });
    expect(result.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([
      'packages/shared/src/types.ts',
      'symbol:packages/shared/src/types.ts:type:UserName',
      'symbol:packages/app/src/index.ts:function:bootstrap',
    ]));
    expect(result.nodes.map((node) => node.id)).not.toContain(
      'symbol:packages/app/src/utils.ts:function:normalizeUser',
    );
    expect(result.edges).toEqual([
      expect.objectContaining({
        kind: 'type-import',
        from: 'symbol:packages/app/src/index.ts:function:bootstrap',
        to: 'symbol:packages/shared/src/types.ts:type:UserName',
      }),
    ]);
  });

  it('supports explicit outgoing traversal from a file seed', () => {
    const repo = createTempRepo(createTypeRefactorSnapshot());
    const context = loadQueryContext(repo.workspaceRoot);

    const result = readImpactSet('packages/shared/src/types.ts', context, {
      direction: 'outgoing',
    });

    expect(result.summary).toMatchObject({
      direction: 'outgoing',
      relationCount: 0,
    });
    expect(result.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([
      'packages/shared/src/types.ts',
      'symbol:packages/shared/src/types.ts:type:UserName',
      'symbol:packages/shared/src/types.ts:function:formatUser',
    ]));
  });

  it('supports bidirectional traversal from a file seed', () => {
    const repo = createTempRepo({
      ...createTypeRefactorSnapshot(),
      relations: [
        ...createTypeRefactorSnapshot().relations,
        {
          kind: 'reexport',
          sourceId: 'ts:reexport',
          fromFilePath: 'packages/shared/src/types.ts',
          toFilePath: 'packages/shared/src/public.ts',
          fromSymbolId: 'symbol:packages/shared/src/types.ts:function:formatUser',
          toSymbolId: 'symbol:packages/shared/src/public.ts:function:exposeUser',
        },
      ],
      symbols: [
        ...createTypeRefactorSnapshot().symbols,
        {
          id: 'symbol:packages/shared/src/public.ts:function:exposeUser',
          name: 'exposeUser',
          kind: 'function',
          filePath: 'packages/shared/src/public.ts',
        },
      ],
    });
    const context = loadQueryContext(repo.workspaceRoot);

    const result = readImpactSet('packages/shared/src/types.ts', context, {
      direction: 'both',
    });

    expect(result.summary).toMatchObject({
      direction: 'both',
      relationCount: 3,
    });
    expect(result.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([
      'symbol:packages/app/src/index.ts:function:bootstrap',
      'symbol:packages/shared/src/public.ts:function:exposeUser',
    ]));
  });
});
