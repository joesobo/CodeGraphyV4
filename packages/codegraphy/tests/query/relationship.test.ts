import { describe, expect, it } from 'vitest';
import { loadQueryContext } from '../../src/query/load';
import { explainRelationship } from '../../src/query/relationship';
import { createTempRepo } from '../support/database';
import { createSampleSnapshot } from '../support/sampleGraph';

describe('query/relationship', () => {
  it('describes direct file edges with their kinds', () => {
    const repo = createTempRepo(createSampleSnapshot());
    const context = loadQueryContext(repo.workspaceRoot);

    const result = explainRelationship({ from: 'src/b.ts', to: 'src/a.ts' }, context);

    expect(result.summary).toMatchObject({
      direct: true,
      kinds: ['import'],
    });
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
});
