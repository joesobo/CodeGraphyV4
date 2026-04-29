import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadQueryContext } from '../../src/query/load';
import { explainRelationship } from '../../src/query/relationship';
import { createTempCodeGraphyHome, createTempRepo } from '../support/database';
import { createSampleSnapshot } from '../support/sampleGraph';

describe('query/relationship', () => {
  let originalHome: string | undefined;

  beforeEach(() => {
    originalHome = process.env.CODEGRAPHY_HOME;
    process.env.CODEGRAPHY_HOME = createTempCodeGraphyHome();
  });

  afterEach(() => {
    process.env.CODEGRAPHY_HOME = originalHome;
  });

  it('describes direct file edges with their kinds', () => {
    const repo = createTempRepo(createSampleSnapshot());
    const context = loadQueryContext(repo.workspaceRoot);

    const result = explainRelationship({ from: 'src/b.ts', to: 'src/a.ts' }, context);

    expect(result.summary).toMatchObject({
      direct: true,
      kinds: ['import'],
    });
  });

  it('finds a direct relationship even when the matching edge is reversed', () => {
    const repo = createTempRepo(createSampleSnapshot());
    const context = loadQueryContext(repo.workspaceRoot);

    const result = explainRelationship({ from: 'src/a.ts', to: 'src/b.ts' }, context);

    expect(result.summary).toMatchObject({
      direct: true,
      kinds: ['import'],
      matchedDirection: 'reverse',
    });
    expect(result.edges).toEqual([
      {
        from: 'symbol:src/b.ts:useExport',
        to: 'symbol:src/a.ts:exportAsJson',
        kind: 'import',
        supportCount: 1,
      },
    ]);
  });

  it('finds a bounded path when no direct edge exists', () => {
    const repo = createTempRepo(createSampleSnapshot());
    const context = loadQueryContext(repo.workspaceRoot);

    const result = explainRelationship({
      from: 'symbol:src/c.ts:runner',
      to: 'symbol:src/a.ts:exportAsJson',
      maxDepth: 3,
    }, context);

    expect(result.summary).toMatchObject({
      direct: false,
      relationCount: 2,
    });
    expect(result.edges.map((edge) => edge.kind)).toEqual(['call', 'import']);
  });

  it('matches relationships when the database stores absolute relation paths', () => {
    const repo = createTempRepo(createSampleSnapshot(), { absoluteRelationPaths: true });
    const context = loadQueryContext(repo.workspaceRoot);

    const result = explainRelationship({
      from: 'src/b.ts',
      to: 'src/a.ts',
    }, context);

    expect(result.summary).toMatchObject({
      direct: true,
      kinds: ['import'],
      matchedDirection: 'forward',
    });
  });
});
